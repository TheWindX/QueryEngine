// TODO, config about retrace depth, from index max reach

const util = require('util')
const q = require('../src/query.js')

class PaserBase {
    constructor(src) {
        this.init()
        this.src = src
    }

    init() {
        this.q = q
        let all = q.all
        let any = q.any
        let not = q.not
        let tryof = q.tryof
        let arg

        // ' '*
        this.blanks = () => q.make((idx) => {
            let i = idx
            if(i > this.src.length ) return null
            for (; i < this.src.length; ++i) {
                if (!/\s/.test(this.src[i])) 
                    break
            }
            return [i, this.src.slice(idx, i)]
        }, 'blanks')

        this.word = (w) => {
            return q.make((idx) => {
                let r = this
                    .src
                    .startsWith(w, idx)
                    ? [
                        idx + w.length,
                        w
                    ]
                    : null
                return r
            }, `${w}`)
        }

        this.regex = (r) => {
            return q.make((idx) => {
                let m = this
                    .src
                    .slice(idx)
                    .match(r)
                if (m) {
                    let str = m[0]
                    return [
                        idx + m.index + str.length,
                        str
                    ] //[idx+m.index+str.length, str]
                }
                return null
            }, r.toString())
        }

        // step 1 item to succ
        this.step = this.q
            .make((idx) => {
                return [idx + 1, null]
            }, 'step')

        this.eq = (val) => this
            .q
            .make((idx) => {
                if (this.src[idx] === val) {
                    return [
                        idx + 1,
                        val
                    ]
                }
                return null
            });

        this.follow = (f, next) => {
            let f1 = q.all(f, q.tryof(next))
            f1.transform = (v) => {
                return v[0]
            }
            return f1
        }

        // math end of file
        this.eof = this
        .q
        .make(idx => {
            let r = (idx >= this.src.length) ? [idx, null] : null
            return r
        }); //TODO, only need ==
        
        // step over 1 until match rule
        this.until = (rule) => {
            let r = q.until(rule, this.step, this.eof)
            r.transform = (v, f, t)=>this.src.slice(f,t)
            return r
        }

        // step over 1 until match rule
        this.till = (rule) => {
            let r = q.till(rule, this.step, this.eof)
            return r
        }



        // match end of line
        this.endl = q.any(this.regex(/^\r?\n/), this.eof)
        
        //match to EOF
        this.gotoEnd = q.make((idx) => [
            this.src.length,
            this
                .src
                .slice(idx)
        ], 'gotoEnd')


        // match to line
        this.line = this.till(this.endl)
        this.transform = (v, f, t)=>{
            return this.src.slice(f, t-v.length)
        }
        //match all lines
        this.lines = q.many(this.line);

        //match no blank
        // (!' ')+
        this.noblanks = () => {
            let r = q.make((idx) => {
                let i = idx
                for (; i < this.src.length; ++i) {
                    if (/\s/.test(this.src[i])) {
                        break
                    }
                }
                if (i > idx) 
                    return [
                        i,
                        this
                            .src
                            .slice(idx, i)
                    ]
                return null
            })
            return r
        }

        // r [, r]+
        this.split = (rule, splitor) => {
            let r = q.all(rule, q.many(q.all(splitor, rule)))
            r.transform = ([v, svs])=>{
                let vs = svs.map(sv=>sv[1])
                vs.unshift(v)
                return vs
            }
            return r
        }
    }
}

module.exports = PaserBase