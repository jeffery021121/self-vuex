const applyMixin = (Vue) => {
  Vue.mixin({
    // 这里的注入和vueRouter不太一应，router是注入的根实例，然后从根实例上代理属性
    beforeCreate: function () {
      // 给每个组件都添加$store
      const { store, parent } = this.$options
      if (store) {
        this.$store = store
      } else {
        // this.$store = this.$parent && this.$parent.$store
        this.$store = parent && parent.$store
      }
    }
  })
}

export default applyMixin