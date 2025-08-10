// promise 有三个状态：pending，fulfilled，or rejected；「规范 Promise/A+ 2.1」
// new promise时， 需要传递一个executor()执行器，执行器立即执行；
// executor接受两个参数，分别是resolve和reject；
// promise  的默认状态是 pending；
// promise 有一个value保存成功状态的值，可以是undefined/thenable/promise；「规范 Promise/A+ 1.3」
// promise 有一个reason保存失败状态的值；「规范 Promise/A+ 1.5」
// promise 只能从pending到rejected, 或者从pending到fulfilled，状态一旦确认，就不会再改变；
// promise 必须有一个then方法，then 接收两个参数，分别是 promise 成功的回调 onFulfilled, 和 promise 失败的回调 onRejected；「规范 Promise/A+ 2.2」
// 如果调用 then 时，promise 已经成功，则执行onFulfilled，参数是promise的value；
// 如果调用 then 时，promise 已经失败，那么执行onRejected, 参数是promise的reason；
// 如果 then 中抛出了异常，那么就会把这个异常作为参数，传递给下一个 then 的失败的回调onRejected；

/**
 * 当前实现最简单的Promise功能，只能处理同步的操作；
 */

const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

class BasicPromise {
  constructor(executor) {
    this.status = PENDING;
    this.value = undefined;
    this.reason = undefined;

    const resolve = (value) => {
      // 状态为 PENDING 时才可以更新状态，防止 executor 中调用了两次 resovle/reject 方法
      if (this.status === PENDING) {
        this.status = FULFILLED;
        this.value = value;
      }
    };

    const reject = (reason) => {
      // 状态为 PENDING 时才可以更新状态，防止 executor 中调用了两次 resovle/reject 方法
      if (this.status === PENDING) {
        this.status = REJECTED;
        this.reason = reason;
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
  }
}

// 当前的BasicPromise 只能处理同步的操作，还不能处理异步的操作；
const p = new BasicPromise((resolve, reject) => {
  console.log("executor");

  // 测试一： 立即执行 resolve，then中的回调会执行
  // resolve("成功了");

  // 测试二： 异步执行resolve，then中的回调不会执行
  setTimeout(() => {
    resolve("成功了");
  }, 2000);
}).then((res) => console.log("success", res));
