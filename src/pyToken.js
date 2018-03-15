
let util = require('./util')

let q = require('./query')
let ParserBase = require('./parserBase')

class PyToken extends ParserBase {
    constructor(src){
        super(src)
        
        this.initState = 0
        
        //token definations
        let t = this
        let str = t.word

        let k = (w) => {
            let r = q.all(str(w), q.tryof(str(' ')));
            r.transform = ([v,_])=> v
            return r
        }
        
        // var name
        t.tvar = t.regex(/^[_a-zA-Z]([_a-zA-Z0-9]*)/)
        t.tvar.transform = s=>['var', s]

        // comment
        // `"""  ... '''`
        let q1 = str(`'''`)
        let q2 = str(`"""`)
        t.tMultiComment = q.any(q.all(q1, t.until(q1)), q.all(q2, t.until(q2)))
        t.tMultiComment.transform = ([l, s], from, to)=>['comment', this.src.slice(from, to)];
        
        // `#
        t.tSingleComment = q.all(str(`#`), this.line);
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

        t.tokens = q.any(t.tprefix, 
            str('('), str(')'), str(','), str('.'), str(':'), str('*'), k('def'), 
            t.tSingleComment, k('as'), k('import'), k('from'), 
            t.tvar, t.tMultiComment, t.tother);
    }

    getTokens() {
        let iters = this.q.query(q.many(this.tokens), 0)
        // filter no used words
        let tokens = iters.next().value[1]
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
        return tokens
    }
};

module.exports = PyToken