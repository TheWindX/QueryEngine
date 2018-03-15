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
        this.blanks = () => q.argument((idx) => {
            let i = idx
            for (; i < this.src.length; ++i) {
                if (!/\s/.test(this.src[i])) 
                    break
            }
            if (i > idx) 
                return [
                    i,
                    this
                        .src
                        .slice(idx, i)
                ]
            return null
        }, 'blanks')

        this.word = (w) => {
            return q.argument((idx) => {
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
            return q.argument((idx) => {
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
        // step 1 char to succ
        let step = () => this
            .q
            .argument((idx) => {
                return [
                    idx + 1,
                    undefined
                ]
            }, 'step')

        this.step = step()
        this.notStep = (rule) => q.all(this.step, q.not(rule))

        this.eq = (val) => this
            .q
            .argument((idx) => {
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

        // step over 1 until match rule
        this.until = (rule) => {
            let r = this
                .q
                .until(this.step, this.q.any(rule, this.eof));
            let r1 = q.all(r, this.q.cut, q.not(this.eof)) //retrace will succ
            r1.transform = (v, f, t) => {
                return this
                    .src
                    .slice(f, t)
            }
            return r1
        }

        // step over 1 until match rule
        this.find = (rule) => {
            let r = this
                .q
                .all(this.q.find(this.step, this.q.any(rule, this.eof)), this.q.not(this.eof));
            r.transform = ([v, _]) => {
                return v
            }
            return r
        }

        // match end of line
        this.endl = this.regex(/^\r?\n/)
        
        // math end of file
        this.eof = this
            .q
            .argument(idx => {
                let r = (idx >= this.src.length) ? [idx, null] : null
                return r
            }); //TODO, only need ==

        //match to EOF
        this.tillEnd = q.argument((idx) => [
            this.src.length,
            this
                .src
                .slice(idx)
        ], 'tillEnd')


        // match to line
        let beforeEl = q.all(this.until(this.endl), this.endl)
        beforeEl.transform = ([l, el])=>l
        this.line = q.any(beforeEl, this.tillEnd)

        //match all lines
        this.lines = q.many(this.line);

        //match no blank
        this.noblanks = () => {
            let r = q.argument((idx) => {
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