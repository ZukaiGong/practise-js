// promise 的优势在于可以链式调用。在我们使用 Promise 的时候，当 then 函数中 return 了一个值，
// 不管是什么值，我们都能在下一个 then 中获取到，这就是所谓的then 的链式调用。
// 而且，当我们不在 then 中放入参数，例：promise.then().then()，
// 那么其后面的 then 依旧可以得到之前 then 返回的值，这就是所谓的值的穿透。
// 那具体如何实现呢？简单思考一下，如果每次调用 then 的时候，我们都重新创建一个 promise 对象，
// 并把上一个 then 的返回结果传给这个新的 promise 的 then 方法，不就可以一直 then 下去了么？

// 1.then 的参数 onFulfilled 和 onRejected 可以缺省，如果 onFulfilled 或者 onRejected不是函数，
// 将其忽略，且依旧可以在下面的 then 中获取到之前返回的值；「规范 Promise/A+ 2.2.1、2.2.1.1、2.2.1.2」
// 2.promise 可以 then 多次，每次执行完 promise.then 方法后返回的都是一个“新的promise"；「规范 Promise/A+ 2.2.7」
// 3.如果 then 的返回值 x 是一个普通值，那么就会把这个结果作为参数，传递给下一个 then 的成功的回调中；
// 4.如果 then 中抛出了异常，那么就会把这个异常作为参数，传递给下一个 then 的失败的回调中；「规范 Promise/A+ 2.2.7.2」
// 5.如果 then 的返回值 x 是一个 promise，那么会等这个 promise 执行完，promise 如果成功，就走下一个 then 的成功；
// 如果失败，就走下一个 then 的失败；如果抛出异常，就走下一个 then 的失败；「规范 Promise/A+ 2.2.7.3、2.2.7.4」
// 6.如果 then 的返回值 x 和 promise 是同一个引用对象，造成循环引用，则抛出异常，把异常传递给下一个 then 的失败的回调中；「规范 Promise/A+ 2.3.1」
// 7.如果 then 的返回值 x 是一个 promise，且 x 同时调用 resolve 函数和 reject 函数，则第一次调用优先，其他所有调用被忽略；「规范 Promise/A+ 2.3.3.3.3」

// https://juejin.cn/post/6850037281206566919

const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

const resolvePromise = (promise, x, resolve, reject) => {
  // 发生场景：
  // const p = new ImitatePromise((resolve) => resolve());
  // const p2 = p.then(() => {
  //   return p2; // 这里返回了自己
  // });
  if (x === promise) {
    return reject(new TypeError("Chaining cycle detected for promise"));
  }

  // 根据 Promise/A+ 规范，then 方法可能会被不规范的实现或恶意代码多次调用回调（比如同时调用 resolve 和 reject，或者多次调用其中一个）。
  // const badThenable = {
  //   then(resolve, reject) {
  //     resolve('first');
  //     reject('second'); // 这里会被忽略
  //     resolve('third'); // 这里也会被忽略
  //   }
  // };
  let called = false; // 避免多次调用

  // 思考：这里为什么不能直接用 x instanceof ImitatePromise 来判断 x 是否是一个 promise 对象？
  // 因为可能 x 是一个 thenable 对象，或者是一个其他的  promise 实现的对象，
  // 所以我们需要通过 x.then 来判断 x 是否是一个 promise 对象。
  // 如果 x 是一个 thenable 对象，那么它的 then 方法是一个函数，我们就可以调用它。
  // 如果 x 是一个其他的 promise 实现的对象，那么它的 then 方法也是一个函数，我们也可以调用它。
  // 如果 x 是一个普通值，那么我们就直接 resolve(x)。
  // 这样就可以处理各种情况了。
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
  // 在 then 方法中使用异步（如 setTimeout），是为了遵循 Promise/A+ 规范 2.2.4 的要求：
  // 所有的回调（onFulfilled/onRejected）必须在当前执行栈清空后再执行，也就是“微任务”或“异步”执行
  // 原因：
  // 1.保证 then 回调总是在本轮事件循环结束后执行，而不是同步执行。
  // 2.这样可以确保 promise 状态改变后，所有 then 注册的回调都能被正确收集和依次执行，避免同步执行时回调顺序错乱或遗漏。
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
        //Promise/A+ 2.2.2
        //Promise/A+ 2.2.4 --- setTimeout
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
}

// 测试 Promise 是否符合Promise/A+规范, 可以使用promises-aplus-tests进行测试
// 1.先安装：npm install promises-aplus-tests
// 2.然后运行：npx promises-aplus-tests promise/03MethodChaining.js
// 3.如果全部通过，说明符合规范
ImitatePromise.defer = ImitatePromise.deferred = function () {
  let dfd = {};
  dfd.promise = new ImitatePromise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
};

module.exports = ImitatePromise;
