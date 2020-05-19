<template>
  <div id="app">
    小明的年龄 {{age}}
    <br />
    我的年龄: {{$store.getters.getAge}}
    <br />
    <button @click="$store.state.age+=10"></button>
    <button @click="changeAge(5)">同步更新状态</button>

    <button @click="$store.dispatch('changeAge',5)">异步更新状态</button>
    {{$store.state.a.c}}
    {{$store.state.b.d}}
  </div>
</template>
<script>
// import { mapState, mapGetters ,mapActions,mapMutations} from "./vuex";
import { mapState, mapGetters, mapActions, mapMutations } from "vuex";

export default {
  computed: {
    // ...mapState(["age"]),
    age() {
      return this.$store.state.age;
    },
    getAge() {
      return this.$store.getters.getAge;
    }
    // ...mapGetters(["getAge"])
  },
  methods: {
    // ...mapMutations(["changeAge"])
    changeAge(payload) {
      this.$store.commit("changeAge", payload);
    }
  },
  mounted() {}
};
</script>