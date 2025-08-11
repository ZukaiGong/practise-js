// 捕获到错误1: 第一个错误
// 捕获到错误2: Error: 第二个错误
//     at file:///D:/practise-js/promise/testErrorChain.js:6:11
new Promise((resolve, reject) => {
  reject("第一个错误");
})
  .then(undefined, (err) => {
    console.log("捕获到错误1:", err);
    throw new Error("第二个错误");
  })
  .then(undefined, (err) => {
    console.log("捕获到错误2:", err);
  })
  .catch((err) => console.log("在最后捕获错误", err));

// 捕获到错误1: 第一个错误
// 在最后捕获错误 Error: 第二个错误
//     at file:///D:/practise-js/promise/testErrorChain.js:6:11
new Promise((resolve, reject) => {
  reject("第一个错误");
})
  .then(undefined, (err) => {
    console.log("捕获到错误1:", err);
    throw new Error("第二个错误");
  })
  // .then(undefined, (err) => {
  //   console.log("捕获到错误2:", err);
  // })
  .catch((err) => console.log("在最后捕获错误", err));
