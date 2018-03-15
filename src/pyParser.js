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

        let t = this;
        let q = this.q;
        let tag = (t) => {
            return q.argument((idx) => {
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
            })
        }

        let str = this.eq

        //import (x [as y])+ x [as y]
        let xy = q.all(tag('var'), q.zero_one(q.all(str('as'), tag('var'))));

        xy.transform = (v) => {
            let r = [v[0]]
            if (v[1]) 
                r.push(v[1][1])
            return r
        }

        let pimport = q.all(str('import'), q.many_one(xy))
        //let pimport = str('import')
        this.pimport = pimport
        pimport.transform = ([_, xys]) => {
            // this.importInfo.push(new PyImFrom(xys))
            return new PyImMod(xys)
        }

        // from mod import (* | (x [as y])+)
        let pfrom = q.all(str('from'), tag('var'), str('import'), q.any(str('*'), q.many_one(xy)))
        pfrom.transform = ([from, mod, im, starOrXys]) => {
            if (starOrXys == "*") {
                return new PyImFrom(mod, null)
            } else {
                return new PyImFrom(mod, starOrXys)
            }
        }

        // def var ( till):
        let pdef = q.all(str('def'), tag('var'), str('('), this.until(str(')')), str(':'))

        let l = (info)=>q.argument((st)=>{
            console.log(info)
            return [st, null]
        })

        // var `(  (var | apply | notStep( `)  )* `)
        let papply = q.all()
        papply.push(tag('var'), 
            str('('),
            q.many(
                q.any(
                    tag('var'), 
                    papply,
                    l('apply1'),
                    )),
            
            str(')'))
        // papply.transform = ([var_, l_, inners, r_])=>[var_, inners]

        let pother = q.all(this.step, q.not(this.eof))
        this.pexpressions = q.any(papply, pdef, pimport, pfrom, tag('prefix'), pother)
    }

    parse() {
        let q = this.q
        //let iters = this.q.query(this.q.many(this.pexpressions), 0)
        let iters = q.query(q.many(this.pexpressions), 0)
        let ms = iters
            .next()
            .value[1]
        ms = ms.filter(m => {
            if(m == null)return false
            if((m instanceof Array) && m[0] === undefined)return false
            return true
        })
        util.inspect(ms)
    }
}

module.exports = PyParser