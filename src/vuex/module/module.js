import { forEach } from "../utils"

export default class Module {
  constructor(optModule) {
    const { state } = optModule
    this._rawModule = optModule
    this._children = {}
    this.state = state
  }
  addChild(name, child) {
    this._children[name] = child
  }
  getChild(childName) {
    return this._children[childName]
  }
  forEachMutation(fn) {
    if (!this._rawModule.mutations) return
    forEach(this._rawModule.mutations, fn)
  }
  forEachAction(fn) {
    if (!this._rawModule.actions) return
    forEach(this._rawModule.actions, fn)
  }
  forEachGetter(fn) {
    if (!this._rawModule.getters) return
    forEach(this._rawModule.getters, fn)
  }
  forEachChild(fn) {
    forEach(this._children, fn)
  }
}