/**
 * 可以在一个类里面判断一个对象是不是自己的实例
 */
class AClass {
  constructor() {}

  instanceMethod(obj) {
    return obj instanceof AClass;
  }
}

const a = new AClass();
const b = new AClass();
console.log("instance?", a.instanceMethod(b)); // true
