const assert = require('assert')
const util = require('./util')


let debug = false
let idC = 0
class IFact {
    constructor(){
        this.id = idC++
        this._name = "noname"
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
        if(this.rec_test) {
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
    constructor(){
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
    f.setName(name?name:'<argument>')
    return f
}

const ok = argument((st) => [st, []], 'ok')

const fail = argument((st) => null, 'fail')

const cut = argument((st) => [st, null], 'cut')

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
                this.iter = this
                    .fact
                    .facts[this.idx]
                    .getIter(this.st)
                return this.iter
            }
        } else {
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
        super()
        this.facts = facts
    }

    name() {
        return `any(${this.facts.map(f=>f.toString()).join(',')})`
    }

    push(f) {
        this
            .facts
            .push(f)
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
            let iter = this
                .fact
                .facts[this.idx]
                .getIter(this.st)
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
                    let f = this.fact.facts[this.idx]
                    let iter = f.getIter(st)
                    this.iters[this.idx] = iter
                    return iter
                } else {
                    return [st, [...this.values]]
                }
            }
            this.idx--
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
        this.facts = facts
    }

    name() {
        return `all(${this.facts.map(f=>f.toString()).join(',')})`
    }

    push(f) {
        this
            .facts
            .push(f)
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
            this.iter = this
                .fact
                .fact
                .getIter(this.st)
            return this.iter
        } else {
            if (this.stVal) {
                return null
            } else {
                return [this.st, []
                ]
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
        this.fact = fact
    }

    name() {
        return `not(${this.fact.toString()})`
    }

    getIter(st) {
        return new IFactNotIter(this, st)
    }
}

function * query(fact, st, isRec=(st, st1)=>st == st1) {
    let factID2St = new Map()
    factID2St.set(fact.id, st)
    let iterStk = []
    let iter = fact.getIter(st)

    for (; true;) {
        let r = iter.next()
        if (r instanceof IFactIter) {
            let st1 = factID2St.get(r.fact.id)
            let bRec = isRec(r.st, st1)
            if(bRec) {
                iter.gain(null)
            } else {
                factID2St.set(r.fact.id, r.st)
                iterStk.push(iter)
                iter = r

                if(debug) {
                    console.log('--------')
                    let strStk = iterStk.map(iter=>iter.fact.toString()).join('\n')
                    console.log(strStk)
                }
            }
            continue
        } else {
            if (iterStk.length != 0) {
                let serverIter = iter
                factID2St.delete(serverIter.fact.id)
                iter = iterStk.pop()
                if(r && serverIter.fact.transform){
                    let v = serverIter.fact.transform(r[1])
                    iter.gain([r[0], v])
                } else {
                    iter.gain(r)
                }
            } else {
                if (r){
                    if(fact.transform){
                        yield [r[0], fact.transform(r[1])]
                    }
                    yield r
                }
                else
                    return
            }
        }
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

const many = (f) => {
    let f1 = all(f)
    let f2 = any(f1, ok)
    f1.push(f2)
    f1.transform = ([a, b]) => {
        if (b instanceof Array) {
            b.unshift(a)
            return b
        } else {
            return [a]
        }
    }
    return f2
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
    return f2
}

const zero_one = (f) => {
    return any(f, ok)
}

const until = (skipFact, untilFact) => {
    let f1 = many(all(not(untilFact), skipFact))
    let f2 = all(f1, untilFact)
    f2.transform = ([a, b]) => {
        return b
    }
    return f2
}

module.exports = {
    zero_one,
    many,
    many_one,
    any,
    all,
    not,
    until,
    cut,
    argument,
    ok,
    fail,
    query,
    debug:(dbg)=>debug = dbg
}
