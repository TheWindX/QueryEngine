const util = require('./util')

const ParserBase = require('./parserBase')
const PyToken = require('./pyToken')

class PyImMod {
    constructor(xys) {
        this.xys = []
        this
            .xys
            .push(...xys)
    }
}

class PyImFrom {
    constructor(mod, xys) {
        this.mod = mod
        this.xys = xys // all functions if xys == null
    }
}

class PyParser extends ParserBase {
    constructor(textSrc) {
        super('')
        this.textSrc = textSrc;
        this.src = (new PyToken(this.textSrc)).getTokens() //tokens as source

        this.importInfo = []

        let q = this.q
        let w = this.eq
        let all = q.all
        let any = q.any

        let tag = (t) => {
            return q.make((idx) => {
                let v = this.src[idx]
                if (v === undefined) 
                    return null
                if (v[0] == t) {
                    return [
                        idx + 1,
                        v[1]
                    ]
                }
                return null
            }, `${t}`)
        }

        
        //import (x [as y])+ x [as y]
        let xy = q.all(tag('var'), q.zero_one(q.all(w('as'), tag('var'))));

        xy.transform = (v) => {
            let r = [v[0]]
            if (v[1]) 
                r.push(v[1][1])
            return r
        }

        let pimport = q.all(w('import'), q.many_one(xy))
        //let pimport = w('import')
        this.pimport = pimport
        pimport.transform = ([_, xys]) => {
            // this.importInfo.push(new PyImFrom(xys))
            return new PyImMod(xys)
        }

        // from mod import (* | (x [as y])+)
        let pfrom = q.all(w('from'), tag('var'), w('import'), q.any(w('*'), q.many_one(xy)))
        pfrom.transform = ([from, mod, im, starOrXys]) => {
            if (starOrXys == "*") {
                return new PyImFrom(mod, null)
            } else {
                return new PyImFrom(mod, starOrXys)
            }
        }

        // def var ( till):
        let pdef = q.all(w('def'), tag('var'), w('('), this.until(w(')')), w(':'))

        // var `(  split(var, ',' )                `)
        let papply = all()
        let para = any(tag('var'), papply )
        let paras = this.split(para, w(','))
        this.paras = paras

        papply.push(tag('var'), w('('), paras, w(')'))
        this.papply = papply
            
        // papply.transform = ([var_, l_, inners, r_])=>[var_, inners]

        let pother = q.all(this.step, q.not(this.eof))
        this.pexpressions = q.any(papply, pdef, pimport, pfrom, tag('prefix'), pother)
    }

    parse() {
        let q = this.q
        //let iters = this.q.query(this.q.many(this.pexpressions), 0)
        //let iters = q.query(q.many(this.pexpressions), 0)
        console.log('begin')
        this.q.debug.all(true)
        this.q.debug.any(true)
        let iters = q.query(this.papply, 0)
        util.inspect(iters.next())
        this.q.debug.any(false)
        this.q.debug.all(false)
        console.log('end')

        // let ms = iters
        //     .next()
        //     .value
        // ms = ms.filter(m => {
        //     if(m == null)return false
        //     if((m instanceof Array) && m[0] === undefined)return false
        //     return true
        // })
        //util.inspect(ms)
    }
}

module.exports = PyParser