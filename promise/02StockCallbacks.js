// 执行01BasicPromise测试脚本异步操作后发现，promise 没有任何返回。
// 因为 promise 调用 then 方法时，当前的 promise 并没有成功，一直处于 pending 状态。
// 所以如果当调用 then 方法时，当前状态是 pending，我们需要先将成功和失败的回调分别存放起来，
// 在executor()的异步任务被执行时，触发 resolve 或 reject，依次调用成功或失败的回调。

const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

class BasicPromise {
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
  then(onFulfilled, onRejected) {
    if (this.status === FULFILLED) {
      onFulfilled(this.value);
    }

    if (this.status === REJECTED) {
      onRejected(this.reason);
    }

    // 如果promise的状态是 pending，需要将 onFulfilled 和 onRejected 函数存放起来，等待状态确定后，再依次将对应的函数执行
    if (this.status === PENDING) {
      this.onFulfilledCallbacks.push(() => {
        onFulfilled(this.value);
      });
      this.onRejectedCallbacks.push(() => {
        onRejected(this.reason);
      });
    }
  }
}

const p = new BasicPromise((resolve, reject) => {
  console.log("executor");

  setTimeout(() => {
    resolve("成功了");
  }, 2000);
}).then((res) => console.log("success", res));
