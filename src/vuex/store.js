import applyMixin from './mixin'
import ModuleCollection from './module/module-collection'
import { forEach } from './utils'

let Vue
const getParent = (rootState, path) => {
  return path.slice(0, -1).reduce((memo, current) => { return memo[current] }, rootState)
}

function install(_Vue) {
  //全局注入$store属性
  Vue = _Vue
  applyMixin(_Vue)
}

/*
  2.安装module，将module的数据整合到store上。
  递归处理树，把参数整合成到各自对象中，方便一会传入vm，
  将state处理好放到root的state上(使用类属性访问器代理一下)，
  将mutation，action,getter都提取到一层，放到对应的store变量中
*/
function installModule(store, rootState, path, module) {
  // 通过path找父级，先处理state，通过path，把所有的state挂到root的state上,可以用class properties语法
  if (path.length) {
    const parent = getParent(rootState, path)
    const moduleName = path.slice(-1)
    parent[moduleName] = module.state
  }
  // 将本module的mutation放到Store的_mutations变量上
  // forEach(module._rawModule.mutations, (mutation, mutationName) => {
  //   store._mutations[mutationName] = store._mutations[mutationName] || []
  //   // store._mutations[mutationName].push(mutation) 这里应该使用使用aop切面编程，可能以后会有处理
  //   store._mutations[mutationName].push((payload) => {
  //     // mutation(module.state, payload)//为了防止this问题，应该指定this
  //     mutation.call(store, module.state, payload)
  //   })
  // })
  // 将遍历的逻辑放到module内部去
  module.forEachMutation((mutation, mutationName) => {
    store._mutations[mutationName] = store._mutations[mutationName] || []
    store._mutations[mutationName].push((payload) => {
      mutation.call(store, module.state, payload)
    })
  })

  // 处理action放到 store._actions 上
  module.forEachAction((action, actionName) => {
    store._actions[actionName] = store._actions[actionName] || []
    store._actions[actionName].push((payload) => {
      action.call(store, store, payload)
    })
  })

  // 处理getters，放到 store._wrappedGetters,值得注意的是同名getters会被覆盖
  module.forEachGetter((getter, getterName) => {
    store._wrappedGetters[getterName] = function () {
      return getter(module.state) //有返回是这里实际上会取值
    }
  })

  // 递归处理child
  module.forEachChild((child, childName) => {
    console.log(11111, child, childName)
    installModule(store, rootState, [...path, childName], child)
  })
}

/*
  3.创建Vue实例，将处理好的state和getter放到Vue上，实现数据的响应式
  可能会有替换实例的情况，例如动态添加module就需要重新生成实例进行替换
*/
function resetStoreVm(store, state) {

  // 这里处理getter然后将其放到计算属性中，实现缓存
  const computed = {}
  store.getters = {}
  forEach(store._wrappedGetters, (wrappedGetter, getterName) => {
    computed[getterName] = wrappedGetter // getter的参数在 wrappedGetter 中已经处理好，这里不需要管参数
    Object.defineProperty(store.getters, getterName, {
      get() { return store._vm[getterName] }
    })
  })

  store._vm = new Vue({
    data() {
      return {
        $$state: state// $开头的变量，不会被直接访问到，会放到_data里面
      }
    },
    computed,
  })

}


class Store {
  constructor(options) {
    // 1. 整理参数。生成module
    this._modules = new ModuleCollection(options)
    this._mutations = {}//{aa:[fn,fn,fn]}
    this._actions = {}//{aa:[fn,fn,fn]}
    this._wrappedGetters = {}
    // this.commit = this.commit.bind(this)用到this的方法，必须绑定this
    /* 
    2. 递归处理树，把参数整合成到各自对象中，方便一会传入vm，
    将state处理好放到root的state上(使用类属性访问器代理一下)，
    将mutation，action,getter都提取到一层，放到对应的store变量中
    */
    installModule(this, this.state, [], this._modules.root);

    /* 
    3.创建Vue实例，将处理好的state和getter放到Vue上，实现数据的响应式
    */
    resetStoreVm(this, this.state)
    console.log('store._wrappedGetters:::', this._wrappedGetters)

  }
  get state() {
    return this._modules.root.state
  }
  commit=(mutationName, payload)=> {
    console.log('commit____this', this)
    this._mutations[mutationName].forEach(mutation => mutation(payload))
  }
  dispatch=(actionName, payload)=> {
    this._actions[actionName].forEach(action => action(payload))
  }
}

export {
  install,
  Store,
}

/* 
其实经过这三个步骤以后，一个基本的vuex就已经完成了，剩余没有处理的有
1. 命名空间
2. vuex插件系统
3. 严格模式以及对应的要求（严格模式下只能通过mutation来修改数据）
4. 动态注册module，其实最终会替换现在的vm
*/