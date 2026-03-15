/**
 * 实现一个retry重试函数，支持指定充实次数和延迟
 *
 * 要求：
 *     ·支持指定重试次数
 *     ·支持延迟重试
 *     ·支持指数退避
 *     ·返回Promise
 */

/**
 * 重试函数，支持指定重试次数、延迟和指数退避
 * @param {Function} fn - 需要重试的异步函数（必须返回Promise）
 * @param {Object} options - 重试配置项
 * @param {number} [options.maxRetries=3] - 最大重试次数
 * @param {number} [options.delay=1000] - 基础延迟时间（毫秒）
 * @param {boolean} [options.exponentialBackoff=true] - 是否启用指数退避
 * @returns {Promise<any>} - 返回执行结果的Promise
 */
async function retry(fn, options = {}) {
  const { maxRetries = 3, delay = 1000, exponentialBackoff = true } = options;

  // 验证输入参数
  if (typeof fn !== "function") {
    return Promise.reject(new Error("fn 必须是一个函数"));
  }
  if (typeof maxRetries !== "number" || maxRetries < 0) {
    return Promise.reject(new Error("maxRetries 必须是非负数字"));
  }
  if (typeof delay !== "number" || delay < 0) {
    return Promise.reject(new Error("delay 必须是非负数字"));
  }

  const excute = async (attempted = 0) => {
    try {
      return await fn();
    } catch (err) {
      if (attempted >= maxRetries) {
        err.message = `执行失败，已达到最大重试次数(${maxRetries})：${err.message}`;
        throw err;
      }

      const currentDelay = exponentialBackoff
        ? delay * Math.pow(2, attempted) // 指数退避：delay * 2^attempt
        : delay; // 固定延迟

      // 等待指定时间后进行下一次重试
      await new Promise((resolve) => {
        setTimeout(resolve, currentDelay);
      });

      return excute(attempted + 1);
    }
  };

  return excute();
}

/**
 * 模拟请求接口
 * @returns
 */
// function requestApi() {
//   return new Promise(function (resolve, reject) {
//     setTimeout(() => {
//       Math.random() > 0.5 ? resolve() : reject();
//     }, 1500);
//   });
// }

/**
 * 渡一的写法（不支持指数退避）
 */
function request(url, maxCount = 5) {
  return fetch(url).catch((err) =>
    maxCount <= 0 ? Promise.reject(err) : request(url, maxCount - 1),
  );
}

/**
 * 测试
 */
request("https://my-json-server.typicode.com/typicode/demo/profile").then(
  (res) => {
    console.log(res);
  },
);

/**
 * 指数退避是一种重试策略：每次重试失败后，不是用固定间隔重试，而是让等待时间按指数级增长。
    通常公式是：delay = baseDelay * (factor ** attempt)，比如 baseDelay=100ms, factor=2：

    第1次重试前等 100ms
    第2次重试前等 200ms
    第3次重试前等 400ms
    第4次重试前等 800ms …
    这样可以减少短时间内大量重复请求对服务的冲击，给系统恢复时间。
 */
