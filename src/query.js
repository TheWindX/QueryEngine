const assert = require('assert')
const util = require('./util')

class IFact {}
//const fail = Symbol('fail')
// let placeHold = Symbol('ok')
class IFactAtom extends IFact {
    run(st){
        return [st, null]
    }
}

class IFactCut extends IFact {}


// [] is unit for combination
const ok = new IFactAtom()
ok.run = (st)=>[st, []]

const err = new IFactAtom()
err.run = (st)=> null

const cut = new IFactCut()

class IFactAll extends IFact {
    constructor(facts = [], combinator = null){
        super()
        this.facts = facts
        this.combinator = combinator
    }

    push(f){
        this.facts.push(f)
        return this
    }
}

class IFactAny extends IFact {
    constructor(facts = []){
        super()
        this.facts = facts
    }

    push(f){
        this.facts.push(f)
        return this
    }
}


class IFactNot extends IFact{
    constructor(fact){
        super()
        this.fact = fact
    }
}

function* queryAllOld(facts, st){
    if(facts.length == 0){
        yield [st, []]
    } else {
        let f1 = facts[0]
        let fo = facts.slice(1)
        if(f1 == cut){
            let st1 = st
            for(let [st2, r2] of queryAll(fo, st1)){
                if(r2 instanceof Array){
                    yield [st2, r2]
                }
            }
            throw cut
        }
        for(let [st1, r1] of query(f1, st)){
            for(let [st2, r2] of queryAll(fo, st1)){
                if(r2 instanceof Array){
                    r2.unshift(r1)
                    yield [st2, r2]
                }
            }
        }
    }
}

function* queryAll(facts, st){
    let lastIdx = facts.length-1
    let frame = []

    let fact = facts[0]
    let iter = query(fact, st)
    frame.push([iter])
    let vals = []
    iterNext:
    for(;true;){
        let idx = frame.length-1
        let [iter] = frame[idx]
        let {value:res, done} = iter.next()
        if(done){
            let fact = facts[idx]
            if(fact == cut) {
                throw cut
            }
            frame.pop()
            if(frame.length == 0) return
            continue iterNext
        } else { 
            let [st, val] = res
            vals[idx] = val
            flush:
            for(let i = idx+1; i<=lastIdx; ++i){
                let fact = facts[i]
                let iter = query(fact, st)
                let {value:res, done} = iter.next()
                if(done){
                    continue iterNext
                } else {
                    frame.push([iter])
                    st = res[0]
                    val = res[1]
                    vals[i] = val
                    continue flush
                }
            }
            yield [st, vals]
        }
    }
}

function* queryException(fact, st){
    try {
        yield* query(fact, st)
    } catch(ex){
        if(ex === cut){
            return
        } else {
            throw ex
        }
    }
}

function* query(fact, st){
    if(!(fact instanceof IFact)){
        assert.fail(util.inspect(fact))
    }
    
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
        let notFound = true
        for(let res of ress){
            notFound = false
        }
        if(notFound) yield [st, []]
    } else if(fact instanceof IFactCut){
        yield [st, null]
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

let until = (skipFact, untilFact)=> {
    let f1 = many(all(not(untilFact), skipFact))
    let f2 = all(f1, untilFact)
    f2.combinator = (a, b)=>{
        return b
    }
    return f2
}


module.exports = {zero_one, many, many_one, any, all, not, until, err, argument, cut, query:queryException}
