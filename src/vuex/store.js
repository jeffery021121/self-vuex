import applyMixin from './mixin'
import ModuleCollection from './module/module-collection'
import { forEach } from './utils'

let Vue
const getParent = (rootState, path) => {
  return path.slice(0, -1).reduce((memo, current) => { return memo[current] }, rootState)
}

// 因为store.replaceState的存在，导致module.state可能是上一个根state里的数据，所以现在要实时获取
const getState = (state, path) => path.reduce((memo, current) => memo[current], state)

// 全局注入$store属性
function install(_Vue) {
  Vue = _Vue
  applyMixin(_Vue)
}
// 在这之前是整理参数生成树，注释写在class内部了

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
    // parent[moduleName] = module.state // 这里不能直接赋值的原因是执行动态添加module的时候，添加上的module就不是响应式了，因为老数据有__ob__所以会走缓存，新的数据就定义不成响应式了
    store._withCommitting(() => {
      Vue.set(parent, moduleName, module.state);
    })
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
  const namespace = store._modules.getNamespace(path)
  // 将遍历的逻辑放到module内部去
  module.forEachMutation((mutation, mutationName) => {
    store._mutations[namespace + mutationName] = store._mutations[namespace + mutationName] || []
    store._mutations[namespace + mutationName].push((payload) => {
      // mutation.call(store, module.state, payload) // 因为replaceState的原因会从根上替换state的原因，module.state不安全了，每次使用得从store.state上实时获取
      // store._withCommitting(()=>{ 要使用_committing包裹，内部是个函数
      //   mutation.call(store, getState(store.state, path), payload)
      // })
      store._withCommitting(mutation.bind(store, getState(store.state, path), payload))
      // 插件的执行只能写到这里，不能写在commit里，因为哪里是一个commit对应一个mutation数组，而插件是一个mutation数组中的一项就触发所有插件
      store._subscribes.forEach(fn => fn({ mutation, type: namespace + mutationName }, store.state))
    })
  })

  // 处理action放到 store._actions 上
  module.forEachAction((action, actionName) => {
    store._actions[namespace + actionName] = store._actions[namespace + actionName] || []
    store._actions[namespace + actionName].push((payload) => {
      action.call(store, store, payload)
    })
  })

  // 处理getters，放到 store._wrappedGetters,值得注意的是同名getters会被覆盖
  module.forEachGetter((getter, getterName) => {
    store._wrappedGetters[namespace + getterName] = function () {
      //有返回是这里实际上会取值
      // 该函数给getter传递了所需参数，并且该函数本身不需要参数
      return getter(getState(store.state, path))
    }
  })

  // 递归处理child
  module.forEachChild((child, childName) => {
    installModule(store, rootState, [...path, childName], child)
  })
}

/*
  3.创建Vue实例，将处理好的state和getter放到Vue上，实现数据的响应式
  可能会有替换实例的情况，例如动态添加module就需要重新生成实例进行替换
*/
function resetStoreVm(store, state) {

  // 这里处理getter然后将其放到计算属性中，实现缓存
  const oldVm = store._vm
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
  if (store.strict) {
    store._vm.$watch(() => store._vm._data.$$state, () => {
      if (!store._committing) console.error('在mutation之外更改了状态')
    }, { deep: true, sync: true })
    // 同步的原因是，一般的watch会放在flashQueue中执行，就异步了，不能保证只能在mutation中同步修改数据，例如先手动改数据，然后使用mutation再改数据，不是同步就检测不到前者了
    // store._vm.$watch(() => store._vm._data.$$state, () => {
    //   console.assert(store._committing, '在mutation之外更改了状态')
    // }, { deep: true, sync: true });
  }
  // debugger
  if (oldVm) { // 替换添加oldVm相关逻辑
    Vue.nextTick(() => oldVm.$destroy());
  }

}


class Store {
  constructor(options) {
    // 1. 整理参数。生成module
    this._modules = new ModuleCollection(options) // root上存放整理好的数据，提供register和getNamespace 两个方法。
    this._mutations = {}//{aa:[fn,fn,fn]} 存放所有mutation
    this._actions = {}//{aa:[fn,fn,fn]} 存放所有action
    this._wrappedGetters = {} // 存放getter的对象，不叫_getters的原因估计是它内部帮getter传递了参数，所以执行wrappedGetter的时候不需要参数
    this._subscribes = [] // 一般来说存储插件注册的函数，在每个mutation函数 执行的时候触发该数组中所有方法

    // 下面两个指针控制严格模式下只能使用mutation修改数据
    this.strict = options.strict
    this._committing = false
    // this.commit = this.commit.bind(this)用到this的方法，必须绑定this
    /* 
    2. 递归处理树，把参数整合成到各自对象中，方便一会传入vm，
    将state处理好放到root的state上(使用类属性访问器代理一下)，
    将mutation，action,getter都提取到一层，放到对应的store变量中
    */
    installModule(this, this._modules.root.state, [], this._modules.root);

    /* 
    3.创建Vue实例，将处理好的state和getter放到Vue上，实现数据的响应式
    */
    resetStoreVm(this, this._modules.root.state)

    /* 
    额外的步骤之 执行或者说注册插件
    */
    this.registPlugins(options.plugins)
  }
  get state() {
    // return this._modules.root.state 如果返回这个state的话，replaceState就没有意义了，因为那个最新的state永远都不会被访问到
    return this._vm._data.$$state
  }
  _withCommitting(fn) {// 操作_committing 指针
    const _committing = this._committing //使用缓存的原因是，原来的_committing不一定是false,用完回复即可
    this._committing = true
    fn()
    // this._committing = false
    this._committing = _committing
  }
  commit = (mutationName, payload) => {
    this._mutations[mutationName].forEach(mutation => mutation(payload))
  }
  dispatch = (actionName, payload) => {
    this._actions[actionName].forEach(action => action(payload))
  }
  registerModule = (path, module) => {
    if (typeof path == 'string') path = [path];
    // 1. 处理函数挂载到this._modules.root上,我们叫它模块注册
    this._modules.register(path, module)
    // 2. 将操作好的数据挂载到Store上 我们叫它模块安装
    // 最后一个参数不能用module，而是得用上一步处理好的 new Module实例，因为需要用到内部的一些方法
    installModule(this, this.state, path, module._rawModule)
    // 3. 生成新的vm替换老vm 我们叫他替换 storeVm
    resetStoreVm(this, this.state)
  }
  subscribe = (subscribeCallBack) => {
    // 手机插件注册的函数，在mutation触发的时候执行即可
    this._subscribes.push(subscribeCallBack)
  }
  registPlugins = (plugins) => {
    plugins.forEach(plugin => { plugin(this) })
  }
  replaceState = (state) => { //因为这个方法会从根上替换state,所以上面使用state的地方，都得从根上取才靠谱
    this._withCommitting(() => {
      this._vm._data.$$state = state
    })
  }
}

export {
  install,
  Store,
}

/*
主流程
1.  install使用Vue.mixin 将$store放到每个组件上,完成

2.  处理参数或者叫模块注册 将参数处理成树结构挂到this._modules.root上 installModule(store, rootState, path, module),完成

3.  处理数据，将所有数据处理成对象格式以后挂到this._modules.root.state上（就像给state强制加了命名空间）,
    收集actions,mutations,getters,实现commit和dispatch完成发布订阅,完成

4.  生成store.vm ，将state和getter分别放到data下的$$state和计算属性上，完成响应式 resetStoreVm(store, state),完成

    其实经过这三个步骤以后，一个基本的vuex就已经完成了，剩余没有处理的有

1.  命名空间  // 每个module实例都能返回自己是否支持namespace,然后moduleCollection实例提供一个查找方法，通过当前path，reduce查找拼接即可,完成

2.  vuex插件系统  // 添加replaceState ,subscribe ,plugins,_subscribes 具体可以看下面的注释,完成

3.  严格模式以及对应的要求（严格模式下只能通过mutation来修改数据）// 添加store.strict和_committing指针，
    使用vue.$watch深度同步检测所有数据的改变。然后内部改数据的地方用_withCommitting包裹一下,完成

4.  动态注册module，其实最终会替换现在的vm // 执行主流程，最后替换vm即可,完成

5.  辅助函数 // 就是一些语法糖,完成
*/

// 注意点，安装module和生成store._vm的时候用的state是我们自己拼接好的state,
// 其他用户调用相关的state都得是响应式的最新的state(还是replaceState的原因)即store._vm._data.$$state
/*
想要写插件系统，得对比着插件的使用去写
// 持久化插件  一般都是从后端重新拉取数据
// function persists(store) {
//   let local = localStorage.getItem('VUEX:STATE');
//   if (local) {
//     store.replaceState(JSON.parse(local));
//   }
//   store.subscribe((mutation, state) => {
//     // 只要频繁操作 就要考虑防抖和节流
//     localStorage.setItem('VUEX:STATE', JSON.stringify(state));
//   })
// };
*/