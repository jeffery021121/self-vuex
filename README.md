
# 思路总结

> 基本上是按照如下思路实现的

## 主流程

- install使用Vue.mixin 将$store放到每个组件上,完成

- 处理参数或者叫模块注册 将参数处理成树结构挂到this._modules.root上 installModule(store, rootState, path, module)

- 处理数据，将所有数据处理成对象格式以后挂到this._modules.root.state上（就像给state强制加了命名空间）,收集actions,mutations,getters,实现commit和dispatch完成发布订阅

- 生成store.vm ，将state和getter分别放到data下的$$state和计算属性上，完成响应式 resetStoreVm(store, state)

## 丰富实现

> 其实讲过上面四个步骤一个基本的vuex就已经完成了，剩余有

- 命名空间
    > 每个module实例都能返回自己是否支持namespace,然后moduleCollection实例提供一个查找方法，通过当前path，reduce查找拼接即可

- vuex插件系统  
    > 添加replaceState ,subscribe ,plugins,_subscribes 具体使用可以看下面的代码

    ```js
    // 持久化插件
    function persists(store) {
    let local = localStorage.getItem('VUEX:STATE');
    if (local) {
        store.replaceState(JSON.parse(local));
    }
    store.subscribe((mutation, state) => {
        localStorage.setItem('VUEX:STATE', JSON.stringify(state));
    })
    };
    ```

- 严格模式以及对应的要求（严格模式下只能通过mutation来修改数据）
    > 添加store.strict和_committing指针，使用vue.$watch深度同步检测所有数据的改变。然后内部改数据的地方用_withCommitting包裹一下

- 动态注册module，其实最终会替换现在的vm
    > 执行主流程，最后替换vm即可

- 辅助函数
    > 就是一些语法糖(mapState, mapGetters, mapMutations, mapActions)

## 注意点

- 安装module和生成store._vm的时候用的state是我们自己拼接好的state,
- 其他用户调用相关的state都得是响应式的最新的state(还是replaceState的原因)即store._vm._data.$$state
