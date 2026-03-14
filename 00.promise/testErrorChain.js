// 捕获到错误1: 第一个错误
// 捕获到错误2: Error: 第二个错误
//     at file:///D:/practise-js/promise/testErrorChain.js:6:11
// new Promise((resolve, reject) => {
//   reject("第一个错误");
// })
//   .then(undefined, (err) => {
//     console.log("捕获到错误1:", err);
//     throw new Error("第二个错误");
//   })
//   .then(undefined, (err) => {
//     console.log("捕获到错误2:", err);
//   })
//   .catch((err) => console.log("在最后捕获错误", err));

// 捕获到错误1: 第一个错误
// 在最后捕获错误 Error: 第二个错误
//     at file:///D:/practise-js/promise/testErrorChain.js:6:11
// new Promise((resolve, reject) => {
//   reject("第一个错误");
// })
//   .then(undefined, (err) => {
//     console.log("捕获到错误1:", err);
//     throw new Error("第二个错误");
//   })
//   // .then(undefined, (err) => {
//   //   console.log("捕获到错误2:", err);
//   // })
//   .catch((err) => console.log("在最后捕获错误", err));

// 测试 在then中抛出错误 会报错还是会被自动捕获：
// 会抛出异常
// new Promise((resolve, reject) => {
//   resolve("第一个值");
// }).then((value) => {
//   throw new Error("第二个错误");
// });

// 测试 catch 之后的 then 是否会继续执行：
// 第一个值: 第一个值
// 捕获到错误: Error: 第二个错误
//     at D:\practise-js\promise\testErrorChain.js:44:11
// 继续执行
new Promise((resolve, reject) => {
  resolve("第一个值");
})
  .then((value) => {
    console.log("第一个值:", value);
    throw new Error("第二个错误");
  })
  .catch((err) => {
    console.log("捕获到错误:", err);
  })
  .then(() => {
    console.log("继续执行");
  });
