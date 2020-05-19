import Module from './module'
import { forEach } from '../utils'

const getParent = (root, path) => path.slice(0, -1).reduce((memo, current) => {
  return memo.getChild(current)
}, root)

class ModuleCollection {
  constructor(options) {
    // 1. 递归处理参数，生成module树、
    this.root = {}
    this.register([], options)
  }
  register(path, optModule) { // 递归注册module为下面的结构，这个方法可以用在动态添加module中
    const newModule = new Module(optModule)
    if (path.length) {
      // 使用reduce和对象的key以及路径找到当前的父对象
      const parent = getParent(this.root, path)
      // 添加孩子
      const moduleName = path.slice(-1)
      parent.addChild(moduleName, newModule)
    } else {
      this.root = newModule
    }
    if (optModule.modules) {
      forEach(optModule.modules, (childOptModule, chiledOptModuleName) => {
        this.register([...path, chiledOptModuleName], childOptModule)
      })
    }
  }

  getNamespace(path) { //根据路径获取命名空间
    let namespace = ''
    // 还是reduce通过path获取拼接好的namespace
    path.reduce((memo, current) => {
      /* 
      const stepModule = memo._children[current]
      const namespaced = stepModule._rawModule.namespaced
       */
      // 上面两步骤可以简化,之前有写好的逻辑
      const stepModule = memo.getChild(current)
      const namespaced = stepModule.namespaced
      if (namespaced) namespace += `${current}/`
      return stepModule
    }, this.root)
    return namespace
  }
}

export default ModuleCollection

// this.root = {
//     _rawModule:xxx,
//     _children:{
//         a:{
//             _rawModule:xxx,
//             state:a.state
//         },
//         b:{
//             _rawModule:xxx,
//             _children:{

//             },
//             state:b.state
//         }，
//     },
//     state:xxx.state
// }