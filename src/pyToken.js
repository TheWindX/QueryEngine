
let util = require('./util')

let q = require('./query')
let ParserBase = require('./parserBase')

class tokenStruct {
    constructor(tag, from, to, value){
        this.tag = tag
        this.from = from
        this.to = to
        this.value = value
    }

    toString(){
        return `${this.tag}:${this.value}`
    }
}


class PyToken extends ParserBase {
    constructor(src){
        super(src)
        
        let t = this
        let q = t.q
        //let w = t.word
        let blank = t.blank
        let blanks = t.blanks()
        let noblanks = t.noblanks()
        let regex = t.regex
        let step = t.step
        let follow = t.follow
        let until = t.until
        let till = t.till
        let eq = t.eq
        let and = q.and
        let or = q.or
        let not = q.not
        let many = q.many
        let tryof = q.tryof
        let line = t.line
        let lines = t.lines
        let eof = t.eof
        let split = t.split


        //token definations
        t.initState = 0

        let w = (str)=>{
            let r = q.make((idx)=>{
                if(this.src.startsWith(str, idx)){
                    return [idx+str.length, str]
                } else {
                    return null
                }
            })

            r.transform = (v, f, t)=>{
                return new tokenStruct('str', f, t, v)
            }
            return r
        }

        //keyword
        let k = (text) => {
            let r = and(this.word(text), tryof(blank));
            r.transform = ([v,_],f,t)=> new tokenStruct('str', f, t, v)
            return r
        }
        
        // var name
        t.tvar = t.regex(/^[_a-zA-Z]([_a-zA-Z0-9]*)/)
        t.tvar.transform = (v, f, t) =>new tokenStruct('var', f, t, v)

        // comment
        // `"""  ... '''` to endl
        let q1 = this.word(`'''`); let comment1 = and(q1, until(q1)) // """ """
        let q2 = this.word(`"""`); let comment2 = and(q2, until(q2)) // ''' '''
        let comment = or(comment1, comment2) //
        t.tMultiComment = and(comment, line) // ''' ''' ... \n
        t.tMultiComment.transform = (v, f, t)=>new tokenStruct('comment', f, t)
        

        // `#
        t.tSingleComment = and(w(`#`), line);
        t.tSingleComment.transform = (v, f, t)=> new tokenStruct('comment', f, t)

        // space or margin space
        t.tmargin = t.blanks()
        t.tmargin.transform = (bs, f, t) => {
            let last = bs.lastIndexOf('\n')
            // util.inspect(`------------------bs:${bs}=${bs.length}, last:${last}`)
            if(last == -1){ // single line
                if(f == 0) return new tokenStruct('margin', f, t, bs)
                else return new tokenStruct('space', f, t, bs)
            } else {
                return new tokenStruct('margin', f, t, bs.slice(last+1))
            }
        }
        
        // other words that need not deal with
        t.tSkip = and(this.step, not(eof))
        t.tSkip.transform = (s, f, t)=> new tokenStruct('skip', f, t)

        
        t.tokens = or(t.tmargin, 
            w('('), w(')'), w(','), w('.'), w(':'), w('*'), k('if'), k('elif'), k('else'), k('while'), k('for'), k('def'),k('class'),
            t.tSingleComment, k('as'), k('import'), k('from'), 
            t.tvar, t.tMultiComment, t.tSkip);
    }

    getTokens() {
        let q = this.q
        let iters = q.query(q.many(this.tokens), 0)
        
        
        // skip needless words (currently)
        let tokens = iters.next()[1].map(([eidx, v])=>v)
        tokens = tokens.filter(t=>{
            if(t instanceof tokenStruct){
                let tag = t.tag
                if(/*tag === 'skip' || */tag === 'space' || tag === 'comment'){
                    return false
                }
            } 
            return true
        })
        
        let lastToken = null
        let tokens1 = tokens
        tokens = []

        // uniq the adjacent
        for(let t of tokens1){
            if(t instanceof tokenStruct){
                if(lastToken instanceof tokenStruct){
                    if(t.tag == "margin" && lastToken.tag == "margin"){
                        tokens.pop()
                        tokens.push(t)    
                    } else if(t.tag == "skip" && lastToken.tag == "skip"){
                        let l = tokens.pop()
                        t.from = l.from
                        tokens.push(t)
                    } else {
                        tokens.push(t)
                    }
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