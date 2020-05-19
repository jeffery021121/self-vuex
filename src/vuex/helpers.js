export const mapState = (stateNames) => {
    let stateObj = {}
    stateNames.forEach(stateName => {
        stateObj[stateName] = function () { // 这里因为要用到计算属性中的this，不能用箭头函数
            return this.$store.state[stateName]
        }
    })
    return stateObj
}

export const mapGetters = (gettersName) => {
    let getterObj = {}
    gettersName.forEach(gettersName => {
        getterObj[gettersName] = function () { // 这里因为要用到计算属性中的this，不能用箭头函数
            return this.$store.state[gettersName]
        }
    })
    return getterObj
}

export const mapMutations = (mutationNames) => {
    let mutationObj = {}
    mutationNames.forEach(mutationName => {
        mutationObj[mutationName] = function (payload) { // 这里因为要用到计算属性中的this，不能用箭头函数
            this.$store.commit(mutationName, payload)
        }
    })
    return mutationObj
}

export const mapActions = (actionNames) => {
    let actionObj = {}
    actionNames.forEach(actionName => {
        actionObj[actionName] = function (payload) { // 这里因为要用到计算属性中的this，不能用箭头函数
            this.$store.dispatch(actionName, payload)
        }
    })
    return actionObj
}