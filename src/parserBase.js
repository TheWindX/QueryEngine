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
                    return [idx+m.index+str.length, str] //[idx+m.index+str.length, str]
                }
                return null            
            }, r.toString())
        }
        // step 1 char to succ
        let step = ()=>this.q.argument((idx)=>[idx+1, null], 'step')

        // step 1 until match rule
        this.untilStep = (rule)=>{
            let r = this.q.until(step(), rule);
            r.transform = (v, stFrom, stTo)=>{
                return this.src.slice(stFrom, stTo);
            }
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
            let r = this.q.all(this.untilStep(this.endl()), this.endl())
            r.transform = ([nendl, endl])=>nendl
            return r
        }

        //match to EOF
        this.tillEnd = ()=>q.argument((idx)=>[this.src.length, this.src.slice(idx)], 'tillEnd')

        //match all lines
        this.lines = ()=>q.many(this.line());

        //match no blank
        this.noblank = ()=> {
            let r = this.untilStep(this.blank())
            return r
        }
    }
}

module.exports = PaserBase