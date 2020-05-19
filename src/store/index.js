import Vue from 'vue'
// import Vuex from 'vuex'
import Vuex from '../vuex'
// import logger from 'vuex/dist/logger'

// replaceState
// subscribe
// plugins

// 持久化插件  一般都是从后端重新拉取数据
function persists(store) {
  let local = localStorage.getItem('VUEX:STATE');
  if (local) {
    store.replaceState(JSON.parse(local));
  }
  store.subscribe((mutation, state) => {
    // 只要频繁操作 就要考虑防抖和节流
    localStorage.setItem('VUEX:STATE', JSON.stringify(state));
  })
};

Vue.use(Vuex);
// 跨组件通信
let store = new Vuex.Store({ // 内部会创造一个vue实例，通信用的
  strict: true, // 严格模式 严格模式下只能通过 mutation来更改状态其他都不可以
  plugins: [
    persists,
    // logger()
  ],
  state: { // 组件的状态  new Vue(data)
    age: 10,
  },
  getters: { // 获取 计算属性 new Vue(computed) 依赖 当依赖的值变化后会重新执行
    getAge(state) { // 如果返回的结果相同 ，不会重新执行这个函数
      // 如果age属性不发生变化 就不会重新执行
      return state.age + 18;
    }
  },
  mutations: { // vue中的方法 唯一可以改状态方法
    changeAge(state, payload) { // 同步的
      state.age += payload
    }
  },
  actions: { // 通过action中发起请求
    changeAge({ commit }, payload) {
      setTimeout(() => {
        commit('changeAge', payload)
      }, 1000);
    }
  },
  modules: {
    a: {
      namespaced: true,
      state: {
        c: 100
      },
      mutations: {
        changeAge(state, payload) {
          console.log('a 更新')
        }
      },
      modules: {
        e: {
          namespaced: true,
          state: {
            c: 100
          }
        }
      }
    },
    b: {
      namespaced: true,
      state: {
        d: 100
      },
      mutations: {
        changeAge(state, payload) {
          console.log('b 更新')
        }
      },
      modules: {
        c: {
          namespaced: true,
          state: {
            e: 100
          },
          mutations: {
            changeAge(state, payload) {
              console.log('c 更新')
            }
          },
        }
      }
    },
  }
})
// 全部namespaced
// 1.默认模块没有 作用域问题 
// 2.状态不要和模块的名字相同
// 3.默认计算属性 直接通过getters取值
// 4.如果增加namespaced:true 会将这个模块的属性 都封装到这个作用域下
// 5.默认会找当前模块上是否有namespace ，并且将父级的namespace 一同算上，做成命名空间

store.registerModule(['e'], {
  state: {
    myAge: 100
  }
})
export default store;