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
  register(path, optModule) {//递归注册module为下面的结构
    const newModule = new Module(optModule)
    if (path.length) {
      // 使用reduce和对象的key以及路径找到当前的父对象
      const parent = getParent(this.root,path)
      console.log('parent:::', parent)
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