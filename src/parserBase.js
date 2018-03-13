const q = require('../src/query.js')

class PaserBase {
    constructor(src) {
        this.src = src
        this.blank = ()=>q.argument((idx)=>{
                let i = idx
                for(; i<this.src.length; ++i){
                    if(!/\s/.test(this.src[i])) break
                }
                if(i>idx) return [i, this.src.slice(idx, i)]
                return null
            })
        this.word = (w)=>{
            return q.argument((idx)=>this.src.startsWith(w, idx)?[idx+w.length, w]:null)
        }
        this.regex = (r)=>{
            return q.argument((idx)=>{
                let m = this.src.slice(idx).match(r)
                if(m){
                    let str = m[0]
                    return [m.index+str.length, str]
                }
                return null            
            })
        }
        this.until = (rule, include=false)=>{
            return q.argument(idx=>{
                for(let i = idx; i<this.src.length; ++i) {
                    //console.log(i)
                    let res = q.query(rule, i).next()
                    //console.log(res)
                    if(!res.done){
                        if(include){
                            let ruleLen = res.value[0]
                            return [i+ruleLen, [this.src.slice(idx, i), res.value[1]]]
                        }
                        return [i, [this.src.slice(idx, i), res.value[1]]]
                    }
                }
                return null
            })
        }
        this.endl = ()=>this.regex(/^\r?\n/)
        this.line = ()=>this.until(this.endl, true)
        this.line.transform = ([before, end])=>{
            return before
        }
        this.tillEnd = ()=>q.argument((idx)=>[this.src.length, this.src.slice(idx)])
        this.lines = ()=>q.all(q.many(this.line()), this.tillEnd())
        this.noblank = ()=> {
            let f = this.until(this.blank(), false)
            f.transform = ([nb, b])=>nb
            return f
        }
    }
}

module.exports = PaserBase