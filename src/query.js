/**
 * @fileoverview , from TheWindX.
 */
/* TODO
 * to fix f* = f* f | ok, cannot to retrace f,
 * recursive detective failed sometimes
 * IFactCatch, IFactException
 * IFact.clone
*/

const assert = require('assert')
let sysUtil = require('util')
const util = require('./util')

class FactID2St {
    constructor() {
        this.map = new Map()
    }

    set(k, v) {
        if (debugRec) {
            console.log(`set k:${k}`, `v:${v}`)
        }
        this
            .map
            .set(k, v)
        if (this.map.size > debugStkSize) { //TODO
            // console.log('--------') this.map.values(iter => iter.fact.toString())
            // .join('\n') console.log(strStk)
            throw new Error(`FactID2St size of ${this.map.size} is too large`)
        }
    }

    get(k) {
        let v = this
            .map
            .get(k)
        if (debugRec) {
            console.log(`get k:${k}`, `v:${v}`)
        }
        return v
    }

    delete(k) {
        if (debugRec) {
            console.log(`del k:${k}`)
        }
        this
            .map
            .delete(k);
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

    // transform folder
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

    name(n) {
        return '  '.repeat(n) + '.'+this._name
    }

    setName(n) {
        this._name = n
    }

    getIter(st) {
        return new IFactIter(this, st)
    }

    toString(n) {
        if (this.rec_test) {
            this.rec_test = false
            return '  '.repeat(n) + 'rec'
        }
        this.rec_test = true
        let r = this.name(n)
        this.rec_test = false
        return r
    }
}

class IFactIter {
    constructor(fact, st) {
        this.fact = fact
        this.st = st
    }

    // 返回st或iterator，或null
    next() {
        return null
    }

    gain(stVal) {}
}

class IFactCustomIter extends IFactIter {
    constructor(fact, st) {
        super(fact, st)
        this.iter = fact.iter(st)
    }

    next() {
        let {value, done} = this
            .iter
            .next()
        if (done) 
            return null
        else 
            return value
    }
}

class IFactCustomer extends IFact {
    constructor(iter, name) {
        super()
        this._name = name
            ? name
            : 'customer'
        this.iter = iter
    }

    getIter(st) {
        return new IFactCustomIter(this, st)
    }
}

const customerIterator = (iter, name) => {
    return new IFactCustomer(iter, name)
}

const makeCustomer = (judge, name) => {
    return customerIterator(function * (st) {
        let v = judge(st)
        if (v == null) 
            return
        yield v
    }, name)
}


class IFactPred extends IFact {
    constructor(pred, name) {
        super()
        this._name = name
            ? name
            : 'pred'
        this._pred = pred
    }

    run(st){
        let stVal = this._pred(st)
        if(stVal){
            if(this.transform){
                let val = this.transform(stVal[1], st, stVal[0])
                return [stVal[0], val]
            }
        }
        return stVal
    }
}

const make = (judge, name) => {
    return new IFactPred(judge, name)
}

class IFactAnyIter extends IFactIter {
    constructor(fact, st) {
        super(fact, st)
        this.facts = this.fact.facts
        this.len = this.facts.length
        this.idx = 0
        this.stVal = undefined
        this.iter = null
        this.init = false
    }

    next() {
        let st = this.st
        let stVal;
        if(!this.init){
            this.init = true
            let fact = this.facts[this.idx]
            if(fact instanceof IFactPred){
                stVal = fact.run(st)
                if(stVal !== null) {
                    this.stVal = null
                    return [stVal[0], [this.idx, stVal[1]]]
                }
            } else {
                return this.iter = fact.getIter(st)
            }
        } else {
            stVal = this.stVal
        }
        
        // next iter
        if(stVal === null){
            for(;true;){
                let idx = ++this.idx
                if(idx === this.len) return null
                let fact = this.facts[idx]
                if(fact instanceof IFactPred){
                    stVal = fact.run(st)
                    if(stVal === null) continue
                    this.stVal = null
                    return [stVal[0], [idx, stVal[1]]]
                } else {
                    return this.iter = fact.getIter(st)
                }
            }
        } else if (stVal === undefined){
            return this.iter // smae iter next
        } else {
            let [st, val] = stVal
            this.stVal = undefined
            let r = [st, [this.idx, val]]
            return r
        }        
    }

    gain(stVal) {
        this.stVal = stVal
    }
}

class IFactAny extends IFact {
    constructor(facts = []) {
        facts.forEach(f => {
            if (!(f instanceof IFact)) 
                throw new Error(`any construct of ${f}`)
        })

        super()
        this.facts = facts
    }

    name(n) {
        return `${ '  '.repeat(n)}|
${this
            .facts
            .map(f => f.toString(n + 1))
            .join(',\n')}`
    }

    push(...facts) {
        facts.forEach(f => {
            if (!(f instanceof IFact)) 
                throw new Error(`any push of ${f}`)
        })
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
        this.facts = this.fact.facts
        this.values = []
        this.stVal = null
    }

    next() {
        let idx = this.idx
        let stVal = this.stVal
        if (this.iters.length == 0) {
            let fact = this.facts[idx]
            if (debugAll) {
                if (!(fact instanceof IFact)) 
                    throw `${sysUtil.inspect(fact)} is not fact`
                console.log(`try ${idx}:${fact.toString(0)}`)
            } 
            if (fact instanceof IFactPred){
                stVal = fact.run(this.st)
                this.iters[idx] = null
            } else {
                let iter = fact.getIter(this.st)
                this.iters[idx] = iter
                return iter;
            }
        }
        retrace : for (; true;) {
            // try to end
            if (stVal != null) {
                let [st,
                    val] = stVal
                stVal = this.stVal = null
                
                this.values[this.idx++] = val
                idx = this.idx
                if (idx != this.facts.length) {
                    let fact = this.facts[idx]
                    if (debugAll) {
                        if (!(fact instanceof IFact)) 
                            throw `${sysUtil.inspect(fact)} is not fact`
                    } 
                    if (fact instanceof IFactPred){
                        stVal = this.stVal = fact.run(st)
                        this.iters[idx] = null
                        continue retrace
                    } else {
                        let iter = fact.getIter(st)
                        this.iters[idx] = iter
                        if(debugAll){
                            console.log(`try ${idx}:${fact.toString(0)}`)
                        }
                        return iter;
                    }
                } else {
                    return [
                        st,
                        this.values
                    ]
                }
            }
            for(;true;){
                idx = --this.idx;
                if (idx < 0) 
                    return null
                let iter = this.iters[idx]
                if(iter === null){
                    continue
                }
                if (iter.fact == cut) 
                    return null
                if(debugAll){
                    console.log(`retrace to: ${idx}:${iter.fact.toString(0)}`)
                }
                return iter
            }
        }
    }

    gain(stVal) {
        this.stVal = stVal
    }
}

class IFactAll extends IFact {
    constructor(facts = []) {
        super()
        facts.forEach(f => {
            if (!(f instanceof IFact)) 
                throw new Error(`all construct of ${f}`)
        })
        this.facts = facts
    }

    name(n) {
        return `${ '  '.repeat(n)}+
${this
            .facts
            .map(f => f.toString(n + 1))
            .join(',\n')}`
    }

    push(...facts) {
        facts.forEach(f => {
            if (!(f instanceof IFact)) 
                throw new Error(`all push of ${f}`)
        })
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
        this.init = false
    }

    next() {
        let stVal = this.stVal
        if (!this.init) {
            this.init = true
            let fact = this.fact.fact
            if (debugNot) {
                if (!(fact instanceof IFact)) 
                    throw `${sysUtil.inspect(fact)} is not fact`
            } if (fact instanceof IFactPred){
                stVal = fact.run(this.st)
                if(stVal) return null
                this.stVal = true
                return [this.st, null]
            } else {
                this.iter = fact.getIter(this.st)
                return this.iter
            }
        } 
        if (this.stVal == null) {
            this.stVal = true // bug fix / to quit //dirty //TODO
            return [this.st, null]
        } else {
            return null
        }
    }

    gain(stVal) {
        this.stVal = stVal
    }
}

class IFactNot extends IFact {
    constructor(fact) {
        super()
        if (!(fact instanceof IFact)) 
            throw new Error(`not construct of ${fact}`)
        this.fact = fact
    }

    name(n) {
        return `${ '  '.repeat(n)}not(${this
            .fact
            .toString(n + 1)}`
    }

    getIter(st) {
        return new IFactNotIter(this, st)
    }
}

class IFactTryIter extends IFactIter {
    constructor(fact, st) {
        super(fact, st)
        this.iter = null
        this.stVal = null
        this.init = false
    }

    next() {
        let stVal = this.stVal
        if (!this.init) {
            this.init = true
            let fact = this.fact.fact
            if (debugTry) {
                if (!(fact instanceof IFact)) 
                    throw `${sysUtil.inspect(fact)} is not fact`
            }
            if (fact instanceof IFactPred){
                stVal = fact.run(this.st)
                if(stVal) return [this.st, stVal[1]]
                this.stVal = null
                return null
            } else {
                this.iter = fact.getIter(this.st)
                return this.iter
            }
        } else {
            if (this.stVal) {
                let [st,
                    val] = this.stVal
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
        if (!(fact instanceof IFact)) 
            throw new Error(`all construct of ${fact}`)
        this.fact = fact
    }

    name(n) {
        return `${ '  '.repeat(n)}try(${this
            .fact
            .toString(n + 1)})`
    }

    getIter(st) {
        return new IFactTryIter(this, st)
    }
}

function * query(fact, st, isRec = (st, st1) => st <= st1) {
    try {
        if (st === undefined || st === null) 
            throw new Error('query without param of "state"')
        if (fact === undefined || fact === null) 
            throw new Error('query without param of "fact"')
        if (fact instanceof IFactPred){
            let stVal = fact.run(st)
            if(stVal) {
                return stVal
            }
            return
        }
        
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
                    //console.warn('left recursive')
                    iter.gain(null)
                } else {
                    factID2St.set(r.fact.id, r.st)
                    iterStk.push(iter)
                    iter = r

                    if (debugStk) {
                        console.log('--------')
                        let strStk = iterStk
                            .map(iter => iter.fact.toString(0))
                            .join('\n')
                        console.log(strStk)
                    }
                }
                continue
            } else {
                if (debugStk) {
                    console.log('--------')
                    let strStk = iterStk
                        .map(iter => iter.fact.toString(0))
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

const tryof = (f) => {
    return not(not(f));//IFactTry(f) //not(not(f)) cannot carry value
}

const ok = make((st) => [
    st, null
], 'ok')

const fail = make((st) => null, 'fail')

const cut = make((st) => [
    st, null
], 'cut')

// f* = f f* | ok //
const many = (f) => {
    let fall = any()
    let fpath1 = all(f, fall)
    fpath1.transform = (vvs) => {
        let v = vvs[0]
        let vs = vvs[1]
        vs.unshift(v)
        return vs
    }
    let fpath2 = ok
    fall.push(fpath1, fpath2)
    fall.transform = ([idx, v]) => {
        if (v === null) {
            v = []
        }
        return v
    }
    let fr = all(fall, ok)
    fr.transform = (v)=>v[0]
    return fr
}

const many_one = (f) => {
    let f1 = f
    let f2 = many(f)
    let fall = all(f1, f2)
    fall.transform = (vvs) => {
        let v = vvs[0]
        let vs = vvs[1]
        vs.unshift(v)
        return vs
    }
    return fall
}

const zero_one = (f) => {
    let f1 = any(f, ok)
    f1.transform = ([eidx, v]) => {
        return v
    }
    return f1
}

const until = (matchFact, stepFact, terminateFact) => {
    let tryStep = all(not(terminateFact), not(matchFact), stepFact)
    let f = any(tryof(matchFact), all(many(tryStep), cut, tryof(matchFact)))
    f.transform = ([eidx, v]) => {
        if (eidx == 0) {
            return []
        } else {
            let [trys,
                _,
                _1] = v
            return trys.map(([_, _1, stepv]) => {
                return stepv
            })
        }
    }
    return f
}

// (until, match)
let till = (matchFact, stepFact, terminateFact) => {
    let tryStep = all(not(terminateFact), not(matchFact), stepFact)
    let f = any(matchFact, all(many(tryStep), cut, matchFact))
    f.transform = ([
        eidx, v
    ], f, t) => {
        if (eidx == 0) {
            return v
        } else {
            let [trys,
                _,
                matchV] = v
            return matchV
        }
    }
    return f
}

const log = (msg) => make(st => {
    let msg1 = msg //TODO // msg as param is reusable(why?), if(call it twice) cannot take as upvale, so copy it
    if (msg1 === undefined) {
        msg1 = st
    } else {
        msg1 = `${msg1}:${st}`
    }
    console.log(`${msg1}`)
    return [st, null]
});

let debugRec = false
let debugStk = false
let debugAny = false
let debugAll = false
let debugNot = false
let debugOthers = true
let debugTry = false
let debugStkSize = 50
let debug = {
    rec(b) {
        debugRec = b
    },
    stk(b) {
        debugStk = b
    },
    stkSize(sz) {
        debugStkSize = sz
    },
    any(b) {
        debugAny = b
    },
    all(b) {
        debugAll = b
    },
    not(b) {
        debugNot = b
    },
    others(b) {
        debugOthers = b
    },
    try(b) {
        debugTry = b
    }
}
module.exports = {
    any,
    all,
    not,
    tryof, // equal to not(not()), more efficence
    zero_one,
    many,
    many_one,
    until,
    till,
    log,
    cut,
    make,
    ok,
    fail,
    query,
    debug
}
