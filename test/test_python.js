let assert = require('assert')
let util = require('../src/util')

const q = require('../src/query2.js')
let {data1} = require('./data_python')

class PaserBase {
    constructor(src) {
        this.src = src
    }

    blanks() {
        return q.argument((idx)=>{
            let i = idx
            for(; i<this.src.length; ++i){
                if(!/\s/.test(this.src[i])) break
            }
            if(i>idx) return [i, this.src.slice(idx, i)]
            return null
        })
    }

    word(w) {
        return q.argument((idx)=>this.src.startsWith(w, idx)?[idx+w.length, w]:null)
    }

    regex(r) {
        return q.argument((idx)=>{
            let m = this.src.slice(idx).match(r)
            if(m){
                let str = m[0]
                return [idx+m.index+str.length, str]
            }
            return null            
        })
    }

    until(rule, include) {
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
        })
    }
}

class PythonParser extends PaserBase {
    constructor(src){
        super(src)
    }

    lines () {
        let endl = this.regex(/^\r?\n/)
        let line = this.until(endl, true)
        line.transform = ([before, match])=>{
            return [before, match]
        }
        return q.many(q.all(line))
    }

    run() {
        //let r  = q.query(this.regex(/\r?\n/), 0)
        //let r  = q.query(this.regex(/^Importing/), 0)
        let r  = q.query(this.lines(), 0)
        util.inspect(r.next())
        //util.inspect(r.next())
    }
}



new PythonParser(data1).run()
