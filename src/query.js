
/* TODO
 * recursive detective failed sometimes
 * IFactCatch, IFactException
 * IFact.clone
*/

const assert = require('assert')
let sysUtil = require('util')
const util = require('./util')

let debugRec = false
let debugStk = false
let debugAny = false
let debugAll = false
let debugNot = false
let debugOthers = true
let debugTry = false
let debugStkSize = 50
let debug = {
    rec(b){
        debugRec = b
    },
    stk(b){
        debugStk = b
    },
    stkSize(sz){
        debugStkSize = sz
    },
    any(b){
        debugAny = b
    },
    any(b){
        debugAll = b
    },
    not(b){
        debugNot = b
    },
    others(b){
        debugOthers = b
    },
    try(b){
        debugTry = b
    }
}



class FactID2St {
    constructor(){
        this.map = new Map()
    }

    set(k, v){
        if(debugRec){
            console.log(`set k:${k}`, `v:${v}`)
        }
        this.map.set(k, v)
        if(this.map.size > debugStkSize){ //TODO
            // console.log('--------')
            // this.map.values(iter => iter.fact.toString())
            //     .join('\n')
            // console.log(strStk)
            throw new Error(`FactID2St size of ${this.map.size} is too large`)
        }
    }

    get(k){
        let v = this.map.get(k)
        if(debugRec){
            console.log(`get k:${k}`, `v:${v}`)
        }
        return v
    }

    delete(k){
        if(debugRec){
            console.log(`del k:${k}`)
        }
        this.map.delete(k);
    }
}

let idC = 0
class IFact {
    constructor() {
        this.id = idC++;
        this._name = "noname"
        this._transform = null
    }

    get transform() {
        return this._transform
    }

    set transform(t) {
        let orinTransform = this._transform
        if (orinTransform) {
            this._transform = (v, stFrom, stTo) => {
                let v1 = orinTransform(v, stFrom, stTo)
                return t(v1, stFrom, stTo)
            }
        } else {
            this._transform = t
        }
    }

    name() {
        return this._name
    }

    setName(n) {
        this._name = n
    }

    getIter(st) {
        return new IFactIter(this, st)
    }

    toString() {
        if (this.rec_test) {
            this.rec_test = false
            return 'rec'
        }
        this.rec_test = true
        let r = this.name()
        this.rec_test = false
        return r
    }
}

class IFactIter {
    constructor(fact, st) {
        this.fact = fact
        this.st = st
    }

    //返回st或iterator，或null
    next() {
        return null
    }

    gain(stVal) {}
}

class IFactAtomIter extends IFactIter {
    constructor(fact, st) {
        super(fact, st)
        this.done = false
    }

    //返回st或iterator，或null
    next() {
        if (this.done) 
            return null
        this.done = true
        return this
            .fact
            .run(this.st)
    }
}

class IFactAtom extends IFact {
    constructor() {
        super()
        this._name = 'atom'
    }

    run(st) {
        return [st, null]
    }

    getIter(st) {
        return new IFactAtomIter(this, st)
    }
}

const argument = (judge, name) => {
    let f = new IFactAtom()
    f.run = judge
    f.setName(name
        ? name
        : '<argument>')
    return f
}

const ok = argument((st) => [
    st, null
], 'ok')

const fail = argument((st) => null, 'fail')

const cut = argument((st) => [
    st, null
], 'cut')

class IFactAnyIter extends IFactIter {
    constructor(fact, st) {
        super(fact, st)
        this.idx = -1
        this.iter = null; //fact.facts[0].getIter(st)
        this.stVal = null
    }

    next() {
        if (this.stVal == null) {
            if (++this.idx == this.fact.facts.length) {
                return null
            } else {
                if (debugAny) {
                    console.log('------------any fail')
                    console.log(this.fact.facts[this.idx].toString())
                }
                let fact = this.fact.facts[this.idx]
                if (debugAny) {
                    if (!(fact instanceof IFact)) 
                        throw `${sysUtil.inspect(fact)} is not fact`
                }
                this.iter = fact.getIter(this.st)
                return this.iter
            }
        } else {
            if (debugAny) {
                console.log('------------any ok')
                console.log(`${this.fact.facts[this.idx]}: ${this.stVal}`)
            }
            let r = this.stVal
            this.stVal = null
            return r
        }
    }

    gain(stVal) {
        this.stVal = stVal
    }
}

class IFactAny extends IFact {
    constructor(facts = []) {
        facts.forEach(f=>{if(!(f instanceof IFact)) throw new Error(`any construct of ${f}`)})
        
        super()
        this.facts = facts
    }

    name() {
        return `any(${this
            .facts
            .map(f => f.toString())
            .join(',')})`
    }

    push(...facts) {
        facts.forEach(f=>{if(!(f instanceof IFact)) throw new Error(`any push of ${f}`)})
        this
            .facts
            .push(...facts)
        return this
    }

    getIter(st) {
        return new IFactAnyIter(this, st)
    }
}

class IFactAllIter extends IFactIter {
    constructor(fact, st) {
        super(fact, st)
        this.idx = 0 //for first in next
        //this.iter = null
        this.iters = [] //[iter]
        this.values = []
        this.stVal = null
    }

    next() {
        if (this.iters.length == 0) {
            let fact = this.fact.facts[this.idx]
            if (debugAll) {
                if (!(fact instanceof IFact)) 
                    throw `${sysUtil.inspect(fact)} is not fact`
            }
            let iter = fact.getIter(this.st)
            this.iters[this.idx] = iter
            return iter;
        }
        retrace : for (; true;) {
            // try to end
            if (this.stVal != null) {
                let [st,
                    val] = this.stVal
                this.stVal = null
                this.values[this.idx++] = val
                if (this.idx != this.fact.facts.length) {
                    let fact = this.fact.facts[this.idx]
                    if (debugAll) {
                        if (!(fact instanceof IFact)) 
                            throw `${sysUtil.inspect(fact)} is not fact`
                    }
                    let iter = fact.getIter(st)
                    this.iters[this.idx] = iter
                    return iter
                } else {
                    return [
                        st,
                        [...this.values]
                    ]
                }
            }
            this.idx--;
            if (this.idx < 0) 
                return null
            let iter = this.iters[this.idx]
            if (iter.fact == cut) 
                return null
            return iter
        }
    }

    gain(stVal) {
        this.stVal = stVal
    }
}

class IFactAll extends IFact {
    constructor(facts = []) {
        super()
        facts.forEach(f=>{if(!(f instanceof IFact)) throw new Error(`all construct of ${f}`)})
        this.facts = facts
    }

    name() {
        return `all(${this
            .facts
            .map(f => f.toString())
            .join(',')})`
    }

    push(...facts) {
        facts.forEach(f=>{if(!(f instanceof IFact)) throw new Error(`all push of ${f}`)})
        this
            .facts
            .push(...facts)
        return this
    }

    getIter(st) {
        return new IFactAllIter(this, st)
    }
}

class IFactNotIter extends IFactIter {
    constructor(fact, st) {
        super(fact, st)
        this.iter = null
        this.stVal = null
    }

    next() {
        if (!this.iter) {
            let fact = this.fact.fact
            if (debugNot) {
                if (!(fact instanceof IFact)) 
                    throw `${sysUtil.inspect(fact)} is not fact`
            }
            this.iter = fact.getIter(this.st)
            return this.iter
        } else {
            if (this.stVal) {
                return null
            } else {
                this.stVal = true // bug fix / to quit //dirty //TODO
                return [this.st, null]
            }
        }
    }

    gain(stVal) {
        this.stVal = stVal
    }
}

class IFactNot extends IFact {
    constructor(fact) {
        super()
        if(!(fact instanceof IFact)) throw new Error(`all construct of ${fact}`)
        this.fact = fact
    }

    name() {
        return `not(${this
            .fact
            .toString()})`
    }

    getIter(st) {
        return new IFactNotIter(this, st)
    }
}

class IFactTryIter extends IFactIter {
    constructor(fact, st){
        super(fact, st)
        this.iter = null
        this.stVal = null
    }

    next() {
        if (!this.iter) {
            let fact = this.fact.fact
            if (debugTry) {
                if (!(fact instanceof IFact)) 
                    throw `${sysUtil.inspect(fact)} is not fact`
            }
            this.iter = fact.getIter(this.st)
            return this.iter
        } else {
            if (this.stVal) {
                let [st, val] = this.stVal
                this.stVal = null
                return [this.st, val]
            } else {
                return null
            }
        }
    }

    gain(stVal) {
        this.stVal = stVal
    }
}

class IFactTry extends IFact { // we need it,  because not(not(f)) cannot carry value
    constructor(fact) {
        super()
        if(!(fact instanceof IFact)) throw new Error(`all construct of ${fact}`)
        this.fact = fact
    }

    name() {
        return `try(${this
            .fact
            .toString()})`
    }

    getIter(st) {
        return new IFactTryIter(this, st)
    }
}

function * query(fact, st, isRec = (st, st1) => st <= st1) {
    try {
        if(st === undefined || st === null) throw new Error('query without param of "state"')
        if(fact === undefined || fact === null) throw new Error('query without param of "fact"')
        let factID2St = new FactID2St()
        factID2St.set(fact.id, st)
        let iterStk = []
        if (debugOthers) {
            if (!(fact instanceof IFact)) 
                throw Error(`${sysUtil.inspect(fact)}(${fact}) is not fact`);
        }
        let iter = fact.getIter(st)

        for (; true;) {
            let r = iter.next()
            if (r instanceof IFactIter) {
                let st1 = factID2St.get(r.fact.id)
                let bRec = isRec(r.st, st1)
                if (bRec) {
                    console.warn('left recursive')
                    iter.gain(null)
                } else {
                    factID2St.set(r.fact.id, r.st)
                    iterStk.push(iter)
                    iter = r

                    if (debugStk) {
                        console.log('--------')
                        let strStk = iterStk
                            .map(iter => iter.fact.toString())
                            .join('\n')
                        console.log(strStk)
                    }
                }
                continue
            } else {
                if (debugStk) {
                    console.log('--------')
                    let strStk = iterStk
                        .map(iter => iter.fact.toString())
                        .join('\n')
                    console.log(strStk)
                }
                if (iterStk.length != 0) {
                    let serverIter = iter
                    factID2St.delete(serverIter.fact.id)
                    iter = iterStk.pop()
                    if (r && serverIter.fact.transform) {
                        let v = serverIter
                            .fact
                            .transform(r[1], serverIter.st, r[0])
                        iter.gain([r[0], v])
                    } else {
                        iter.gain(r)
                    }
                } else {
                    if (r) {
                        if (fact.transform) {
                            yield[r[0],
                                fact.transform(r[1], st, r[0])]
                        } else {
                            yield r
                        }
                    } else 
                        return
                }
            }
        }
    } catch (ex) {
        console.error()
        throw ex
    }

}

const any = (...fs) => {
    let f = new IFactAny(fs)
    return f
}

const all = (...fs) => {
    let f = new IFactAll(fs)
    return f
}

const not = (f) => {
    return new IFactNot(f)
}

const tryof = (f)=>{
    return new IFactTry(f) //not(not(f)) cannot carry value
}

const many = (f) => {
    let f1 = all(f)
    let f2 = any(f1, ok)
    f2.transform = (r) => {
        if (r == null) {
            return []
        }
        return r
    }
    f1.push(cut, f2) // cut in general case?
    f1.transform = ([a, c, b]) => {
        if (b instanceof Array) {
            b.unshift(a)
            return b
        } else {
            return [a]
        }
    }
    f3 = all(f2)
    f3.transform = ([all]) => { //not to effect for f2 recursive tranform
        return all
    }
    return f3
}

const many_one = (f) => {
    let f1 = many(f)
    let f2 = all(f)
    f2.transform = ([a, b]) => {
        if (b instanceof Array) {
            b.unshift(a)
            return b
        } else {
            return [a]
        }
    }
    f2.push(f1)
    f3 = all(f2)
    f3.transform = ([all]) => { //not to effect for f2 recursive tranform
        return all
    }
    return f3
}

const zero_one = (f) => {
    return any(f, ok)
}

// (!f, step)*
const until = (stepFact, untilFact) => {
    let f = many(all(not(untilFact), stepFact))
    return f
}

// (until, match)
const find = (stepFact, tofind) => {
    let f = all(until(stepFact, tofind), tofind)
    f.transform = ([_, v])=>v
    return f
}

module.exports = {
    zero_one,
    many,
    many_one,
    any,
    all,
    not,
    tryof,
    until,
    find,
    cut,
    argument,
    ok,
    fail,
    query,
    debug
}
