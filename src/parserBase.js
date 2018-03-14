const q = require('../src/query.js')

class PaserBase {
    constructor(src) {
        this.src = src
        this.q = q
        this.blank = ()=>q.argument((idx)=>{
                let i = idx
                for(; i<this.src.length; ++i){
                    if(!/\s/.test(this.src[i])) break
                }
                if(i>idx) return [i, this.src.slice(idx, i)]
                return null
            }, 'blank')
        this.word = (w)=>{
            if(!w){
                let i = 0
            }
            return q.argument((idx)=>this.src.startsWith(w, idx)?[idx+w.length, w]:null, `'${w}'`)
        }
        this.regex = (r)=>{
            return q.argument((idx)=>{
                let m = this.src.slice(idx).match(r)
                if(m){
                    let str = m[0]
                    return [m.index+str.length, str]
                }
                return null            
            }, r.toString())
        }
        this.until = (rule, include=false)=>{
            return q.argument(idx=>{
                for(let i = idx; i<this.src.length; ++i) {
                    let res = q.query(rule, i).next()
                    if(!res.done){
                        if(include){
                            let ruleLen = res.value[0]
                            return [i+ruleLen, [this.src.slice(idx, i), res.value[1]]]
                        }
                        return [i, [this.src.slice(idx, i), res.value[1]]]
                    }
                }
                return null
            }, `until(${rule.toString()}`)
        }
        this.endl = ()=>this.regex(/^\r?\n/)
        this.line = ()=>this.until(this.endl, true)
        this.line.transform = ([before, end])=>{
            return before
        }
        this.tillEnd = ()=>q.argument((idx)=>[this.src.length, this.src.slice(idx)], 'tillEnd')
        this.lines = ()=>q.all(q.many(this.line()), this.tillEnd())
        this.noblank = ()=> {
            let f = this.until(this.blank(), false)
            f.transform = ([nb, b])=>nb
            let f1 = q.any(f, this.tillEnd())
            //f1.transform = (nb, te)=>v == null?"":v
            return f1
        }
    }
}

module.exports = PaserBase