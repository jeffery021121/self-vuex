export const forEach = (obj, fn) => {
  let iterObj = obj||{}
  Object.entries(iterObj).forEach(([key, value]) => { fn(value, key) })
}

