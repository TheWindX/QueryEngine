const util = require('util')
const q = require('../src/query.js')

class PaserBase {
    constructor(src) {
        this.src = src
        this.q = q
        this.blanks = ()=>q.argument((idx)=>{
                let i = idx
                for(; i<this.src.length; ++i){
                    if(!/\s/.test(this.src[i])) break
                }
                if(i>idx) return [i, this.src.slice(idx, i)]
                return null
            }, 'blanks')

        this.word = (w)=>{
            return q.argument((idx)=>{
                let r = this.src.startsWith(w, idx)?[idx+w.length, w]:null
                return r
            }, `${w}`)
        }
        this.regex = (r)=>{
            return q.argument((idx)=>{
                let m = this.src.slice(idx).match(r)
                if(m){
                    let str = m[0]
                    return [idx+m.index+str.length, str] //[idx+m.index+str.length, str]
                }
                return null            
            }, r.toString())
        }
        // step 1 char to succ
        let step = ()=>this.q.argument((idx)=>{
            if(idx >= this.src.length) {
                return null
            } 
            return [idx+1, null]
        }, 'step')

        // step 1 until match rule
        this.untilStep = (rule)=>{
            let r = this.q.until(step(), rule);
            // r.transform = (v, stFrom, stTo)=>{
            //     return this.src.slice(stFrom, stTo);
            // }
            return r
        }
        

        // match end of line
        this.endl = ()=>{
            let r = this.regex(/^\r?\n/)
            let r1 = this.q.argument((st)=>st >= this.src.length?[st, null]:null)
            return q.any(r, r1)
        }

        // match to line
        this.line = ()=>{
            let r = this.untilStep(this.endl())
            r.transform = (v, from, to)=>{
                return this.src.slice(from, to-(v?v.length:0))
            }
            return r
        }

        //match to EOF
        this.tillEnd = ()=>q.argument((idx)=>[this.src.length, this.src.slice(idx)], 'tillEnd')

        //match all lines
        this.lines = ()=>q.many(this.line());

        //match no blank
        this.noblanks = ()=> {
            let r = q.argument((idx)=>{
                let i = idx
                for(;i<this.src.length; ++i){
                    if(/\s/.test(this.src[i])){
                        break
                    }
                }
                if(i>idx) return [i, this.src.slice(idx, i)]
                return null
            })
            //let r = this.untilStep(this.blank())
            // r.transform = (v, from, to)=>{
            //     console.log(`${v}, ${from}, ${to}`)
            //     console.log(this.src.slice(from, to-(v?v.length:0)))
            //     return this.src.slice(from, to-(v?v.length:0))
            // }
            return r
        }

        this.splitBy = (splitRule, rule)=>{
            let blanks = this.blanks();
            let r = q.all(blanks, rule, q.many(
                q.all(
                    blanks, splitRule, blanks, rule) ));
            r.transform = (val)=>{
                util.inspect(val)
                let vs = val[2].map(m=>m[3]).unshift(val[1])
                console.log(vs)
                return vs.map(m=>m[3]).unshift(r)
            };
            return r
        }
    }
}

module.exports = PaserBase