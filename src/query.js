let util = require('util')
let inspect = (x)=>{
    console.log(util.inspect(x))
}

//const fail = Symbol('fail')
// let placeHold = Symbol('ok')
class IFactAtom {
    run(st){
        return [st, null]
    }
}

let ok = new IFactAtom()
ok.run = (st)=>[st, null]

let err = new IFactAtom()
err.run = ()=> null


class IFactAll {
    constructor(facts = [], combinator = null){
        this.facts = facts
        this.combinator = combinator
    }

    push(f){
        this.facts.push(f)
        return this
    }
}

class IFactAny {
    constructor(facts = []){
        this.facts = facts
    }

    push(f){
        this.facts.push(f)
        return this
    }
}


class IFactNot {
    constructor(fact){
        this.fact = fact
    }
}

const cut = Symbol()
const cutTrue = Symbol()
const cutFalse = Symbol()

function* queryAll(facts, st){
    if(facts.length == 0){
        yield [st, []]
    } else {
        let f1 = facts[0]
        let fo = facts.slice(1)
        for(let [st1, r1] of query(f1, st)){
            for(let [st2, r2] of queryAll(fo, st1)){
                if(r2 instanceof Array){
                    r2.unshift(r1)
                    yield [st2, r2]
                }
                // else {
                //     yield [st2, [r1]]
                // }
            }
        }
    }
}

function* query(fact, st){
    if(fact instanceof IFactAtom){
        let res = fact.run(st)
        if(res != null) yield res
    } else if(fact instanceof IFactAny){
        for(let f of fact.facts){
            let ress = query(f, st)
            for(let res of ress){
                yield res
            }
        }
    } else if(fact instanceof IFactAll){
        let ress = queryAll(fact.facts, st)
        for(let [st1, res1] of ress){
            if(fact.combinator){
                yield [st1, fact.combinator(...res1)]
            } else {
                yield [st1, res1]
            }
        }
    } else if(fact instanceof IFactNot){
        let ress = query(fact.fact, st)
        let found = false
        for(let res of ress){
            found = true
        }
        if(!found) [null, st]
    }
}

let any = (...fs)=>{
    let f = new IFactAny(fs)
    return f
}

let all = (...fs)=>{
    let f = new IFactAll(fs)
    return f
}

let not = (f)=>{
    return new IFactNot(f)
}

let many = (f)=>{
    let f1 = all(f)
    let f2 = any(f1, ok)
    f1.push(f2)
    f1.combinator = (a,b)=>{
        if(b instanceof Array){
            b.unshift(a)
            return b
        } else {
            return [a]
        }
    }
    return f2
}

let many_one = (f)=>{
    let f1 = many(f)
    let f2 = all(f)
    f2.combinator = (a, b)=>{
        if(b instanceof Array){
            b.unshift(a)
            return b
        } else {
            return [a]
        }
    }
    f2.push(f1)
    return f2
}

let zero_one = (f)=>{
    return any(f, ok)
}

let argument = (judge)=>{
    let f = new IFactAtom()
    f.run = judge
    return f
}

module.exports = {zero_one, many, many_one, any, all, not, err, argument, cut, cutTrue, cutFalse, query}
