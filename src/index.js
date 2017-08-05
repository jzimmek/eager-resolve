export function eager(batchFn, mapFn){
  let entriesOfContext = new Map(),
      scheduled = false

  return (source,args,context,info) => {
    if(!scheduled){
      scheduled = true
      process.nextTick(() => {
        const entries = entriesOfContext.get(context)

        const {sources,resolves,rejects} = entries.reduce(({sources,resolves,rejects},[source,resolve,reject]) => ({
          sources: [...sources, source],
          resolves: [...resolves, resolve],
          rejects: [...rejects, reject],
        }), {sources:[],resolves:[],rejects:[]})

        Promise
          .resolve(batchFn(sources,args,context,info))
          .then(results => mapFn(sources, results).forEach((r,idx) => resolves[idx](r)))
          .catch((err) => rejects.forEach(reject => reject(err)))

        entriesOfContext.delete(context)
        scheduled = false
      })
    }

    return new Promise((resolve,reject) => {
      let entries = entriesOfContext.get(context)
      entries = [...(entries||[]), [source,resolve,reject]]

      entriesOfContext.set(context, entries)
    })
  }
}

export function mapByProperty(sourceProperty,resultProperty=sourceProperty){
  return (source,result) =>
    result && source[sourceProperty] === result[resultProperty]
}

const mapById = mapByProperty("id")

export function one(fn=((val) => val), map=mapById){
  return (sources,results) => sources.map(s => {
    return fn(results.find(r => map(s, r)))
  })
}

export function many(fn=((val) => val), map=mapById){
  return (sources,results) => {
    return fn(sources.map(source => results.filter(result => map(source, result))))
  }
}
