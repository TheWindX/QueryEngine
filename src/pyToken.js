
let util = require('./util')

let q = require('./query')
let ParserBase = require('./parserBase')

class PyToken extends ParserBase {
    constructor(src){
        super(src)
        
        let t = this
        let q = t.q
        let w = t.word
        let b = t.blanks()
        let nb = t.noblanks()
        let regex = t.regex
        let step = t.step
        let follow = t.follow
        let until = t.until
        let till = t.till
        let eq = t.eq
        let all = q.all
        let any = q.any
        let not = q.not
        let tryof = q.tryof
        let l = t.line
        let ls = t.ls
        let eof = t.eof


        //token definations
        t.initState = 0

        //keyword
        let k = (text) => {
            let r = all(w(text), tryof(w(' ')));
            r.transform = ([v,_])=> v
            return r
        }
        
        // var name
        t.tvar = t.regex(/^[_a-zA-Z]([_a-zA-Z0-9]*)/)
        t.tvar.transform = s=>['var', s]

        // comment
        // `"""  ... '''`
        let q1 = w(`'''`)
        let q2 = w(`"""`)
        t.tMultiComment = any(all(q1, until(q1)), all(q2, until(q2)))
        t.tMultiComment.transform = (v, from, to)=>['comment', t.src.slice(from, to)];
        
        // `#
        t.tSingleComment = all(w(`#`), l);
        t.tSingleComment.transform = (l)=>['comment', l];

        // space or prefix space
        t.tprefix = t.blanks()
        t.tprefix.transform = (bs, from, to) => {
            let last = bs.lastIndexOf('\n')
            let len = to-(from + bs.lastIndexOf('\n') + 1)
            if(last == -1){
                if(from == 0) return ['prefix', len]
                else return ['space']
            } else {
                return ['prefix', len]
            }
        }
        
        // other words that need not deal with
        t.tother = t.noblanks()
        t.tother.transform = s=> ['other']

        t.tokens = any(t.tprefix, 
            w('('), w(')'), w(','), w('.'), w(':'), w('*'), k('def'), 
            t.tSingleComment, k('as'), k('import'), k('from'), 
            t.tvar, t.tMultiComment, t.tother);
    }

    getTokens() {
        let q = this.q
        let iters = q.query(q.many(this.tokens), 0)
        // filter no used words
        let tokens = iters.next().value[1].map(([eidx, v])=>v)
        tokens = tokens.filter(t=>{
            if((t instanceof Array)){
                let tag = t[0]
                if(tag === 'other' || tag === 'space' || tag === 'comment'){
                    return false
                }
            } 
            return true
        })

        // skip no used words (currently)
        let lastToken = null
        let tokens1 = tokens
        tokens = []
        for(let t of tokens1){
            if((t instanceof Array)&&t[0] == "prefix"&&(lastToken instanceof Array)){ // when 'prefix' is adjacency, remove previous, take the last
                if(t[1] == lastToken[1]){
                    tokens.pop()
                    tokens.push(t)
                } else {
                    tokens.push(t)
                }
            } else {
                tokens.push(t)
            }
            lastToken = t
        }
        util.inspect(tokens)
        console.log("------------------------------------")
        return tokens
    }
};

module.exports = PyToken