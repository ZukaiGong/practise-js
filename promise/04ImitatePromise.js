const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

const resolvePromise = (promise, x, resolve, reject) => {
  if (x === promise) {
    return reject(new TypeError("Chaining cycle detected for promise"));
  }

  let called = false; // 避免多次调用

  if ((typeof x === "object" && x !== null) || typeof x === "function") {
    // then的返回值x是一个promise
    try {
      const then = x.then; // 可能是一个thenable对象
      if (typeof then === "function") {
        then.call(
          x,
          // y 是 x resolve 的值
          (y) => {
            if (called) return;
            called = true;
            // 递归解析的过程（因为可能 promise 中还有 promise） Promise/A+ 2.3.3.3.1
            resolvePromise(promise, y, resolve, reject);
          },
          // r 是 x reject 的值
          (r) => {
            // 只要失败就失败 Promise/A+ 2.3.3.3.2
            if (called) return;
            called = true;
            reject(r);
          }
        );
      } else {
        resolve(x);
      }
    } catch (e) {
      if (called) return;
      called = true;
      reject(e);
    }
  } else {
    // 普通值
    resolve(x);
  }
};

class ImitatePromise {
  constructor(executor) {
    this.status = PENDING;
    this.value = undefined;
    this.reason = undefined;

    // 存放成功的回调
    this.onFulfilledCallbacks = [];
    // 存放失败的回调
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      // 如果 value 是一个promise，那我们的库中应该也要实现一个递归解析
      if (value instanceof ImitatePromise) {
        return value.then(resolve, reject);
      }

      // 状态为 PENDING 时才可以更新状态，防止 executor 中调用了两次 resovle/reject 方法
      if (this.status === PENDING) {
        this.status = FULFILLED;
        this.value = value;
        this.onFulfilledCallbacks.forEach((fn) => fn());
      }
    };

    const reject = (reason) => {
      // 状态为 PENDING 时才可以更新状态，防止 executor 中调用了两次 resovle/reject 方法
      if (this.status === PENDING) {
        this.status = REJECTED;
        this.reason = reason;
        this.onRejectedCallbacks.forEach((fn) => fn());
      }
    };

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  // 包含一个 then 方法，并接收两个参数 onFulfilled、onRejected
  then(onFulfilled, onRejected) {
    // 解决 onFufilled，onRejected 没有传值的问题
    // Promise/A+ 2.2.1 / Promise/A+ 2.2.5 / Promise/A+ 2.2.7.3 / Promise/A+ 2.2.7.4
    onFulfilled =
      typeof onFulfilled === "function" ? onFulfilled : (value) => value;
    // 因为错误的值要让后面访问到，所以这里也要抛出个错误，不然会在之后 then 的 resolve 中捕获
    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : (reason) => {
            throw reason;
          };

    // 每次调用 then 都返回一个新的 promise  Promise/A+ 2.2.7
    const newPromise = new ImitatePromise((resolve, reject) => {
      if (this.status === FULFILLED) {
        setTimeout(() => {
          try {
            //Promise/A+ 2.2.7.1
            const x = onFulfilled(this.value);
            // x可能是一个proimise
            resolvePromise(newPromise, x, resolve, reject);
          } catch (e) {
            // 如果 onFulfilled 抛出异常，则将异常传递给下一个 then 的失败的回调中
            reject(e);
          }
        }, 0);
      }

      if (this.status === REJECTED) {
        //Promise/A+ 2.2.3
        setTimeout(() => {
          try {
            const x = onRejected(this.reason);
            resolvePromise(newPromise, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        }, 0);
      }

      // 如果promise的状态是 pending，需要将 onFulfilled 和 onRejected 函数存放起来，等待状态确定后，再依次将对应的函数执行
      if (this.status === PENDING) {
        this.onFulfilledCallbacks.push(() => {
          setTimeout(() => {
            try {
              const x = onFulfilled(this.value);
              resolvePromise(newPromise, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          }, 0);
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              const x = onRejected(this.reason);
              resolvePromise(newPromise, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          }, 0);
        });
      }
    });

    return newPromise;
  }

  static resolve(value) {
    return new ImitatePromise((resolve, reject) => {
      resolve(value);
    });
  }

  static reject(reason) {
    return new ImitatePromise((resolve, reject) => {
      reject(reason);
    });
  }

  static all(promises) {
    if (!Array.isArray(promises)) {
      return ImitatePromise.reject(
        new TypeError("TypeError: Argument is not iterable")
      );
    }

    return new ImitatePromise((resolve, reject) => {
      const result = [];
      let count = 0;

      const processData = (index, value) => {
        result[index] = value;
        if (++count === promises.length) {
          resolve(result);
        }
      };

      for (let i = 0; i < promises.length; i++) {
        if (promises[i] && typeof promises[i].then === "function") {
          promises[i].then((res) => {
            processData(i, res);
          }, reject);
        } else {
          processData(i, promises[i]);
        }
      }
    });
  }
}

ImitatePromise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected);
};

// 立即返回一个新的 Promise。
// 无论当前 promise 的状态如何，此新的 promise 在返回时始终处于待定（pending）状态。
// 如果 onFinally 抛出错误或返回被拒绝的 promise，则新的 promise 将使用该值进行拒绝。(*)
// 否则，新的 promise 将以与当前 promise 相同的状态敲定（settled）。
ImitatePromise.prototype.finally = function (onFinally) {
  return this.then(
    (value) => {
      return ImitatePromise.resolve(onFinally()).then(() => value);
    },
    (reason) => {
      return ImitatePromise.resolve(onFinally()).then(() => {
        throw reason;
      });
    }
  );
};

// ##################   test   ###################

// ImitatePromise.resolve(
//   new ImitatePromise((resolve, reject) => {
//     setTimeout(() => {
//       // resolve("hello");
//       // reject("error");
//       resolve(new Error("error"));
//     }, 1000);
//   })
// ).then(
//   (res) => {
//     console.log("res", res);
//   },
//   (err) => {
//     console.log("err", err);
//   }
// );

// ImitetePromise与标准Promise行为出现不同，在标准Promise中会直接抛出异常，
// 在ImitatePromise中的异常都被捕获了
// new ImitatePromise((resolve, reject) => {
//   resolve("第一个值");
// }).then((value) => {
//   throw new Error("第二个错误");
// });
