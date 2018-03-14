
let util = require('./util')

let q = require('./query')
let ParserBase = require('./parserBase')

class PyToken extends ParserBase {
    constructor(src){
        super(src)
        
        this.initState = 0
        
        let t = this
        t.timport = t.word('import')
        t.tfrom = t.word('from')
        t.tcomma = t.word(',')
        t.tas = t.word('as')
        t.tvar = t.regex(/^[_a-zA-Z]([_a-zA-Z0-9]*)/)
        // t.tvar.transform = ()=>''
        t.tvar.transform = s=>['var', s]
        // t.tspace = t.blanks()
        // t.tspace.transform = s=>[' ', s]

        let q1 = t.word(`'''`)
        let q2 = t.word(`"""`)
        t.tcomment = q.any(q.all(q1, t.untilStep(q1)), q.all(q2, t.untilStep(q2)))
        t.tcomment.transform = ([l, s], from, to)=>['comment', this.src.slice(from, to)];
        t.tprefix = t.blanks()
        t.tprefix.transform = (bs, from, to) => {
            let last = bs.lastIndexOf('\n')
            let len = to-(from + bs.lastIndexOf('\n') + 1)
            if(last == -1){
                if(from == 0) return ['prefix', len]
                else return ' '
            } else {
                return ['prefix', len]
            }
        }
        t.tother = t.noblanks()
        t.tother.transform = s=>''

        t.tokens = q.any(t.tprefix, t.tcomment, t.timport, t.tvar, t.tother)
    }

    run() {
        this.src = `"""
12345
"""  
    import urllib2
        import json
        
        screen_name = "wordpress"
        
         url = "http://api.twitter.com/1/statuses/user_timeline.json?screen_name=" + screen_name
        
        data = json.load(urllib2.urlopen(url)) """
asdfa
"""        
        print len(data), "tweets"
        
        for tweet in data:
            print tweet['text']`
        let iters = q.query(q.many(this.tokens), 0)
        //let iters = q.query(this.tcomment, 0)
        util.inspect(iters.next())
    }
}

(new PyToken()).run()

