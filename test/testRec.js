let assert = require('assert')
let util = require('../src/util')

let q = require('../src/query')
let PaserBase = require('../src/parserBase')

class ParserRec extends PaserBase{
    constructor(src){
        super(src)
    }

    run() {
        let q = this.q
        let w = this.word
        let b = this.blanks()
        let nb = this.noblanks()
        let regex = this.regex
        let follow = this.follow
        let and = q.and
        let or = q.or

        this.src = "a(da(dddda()))"

        let r = and()

        r.push(w('a'), w('('), q.many( q.or(w('d'), r ) ), w(')'))

        r.transform = ([a, _, inner, _1]) => {
            return [a, inner]
        }

        let iters = q.query(r, 0)
        util.inspect(iters.next())

        ////
        this.src = "11111111111111"

        r = and()

        r.push(q.zero1(r), w('1'))

        r.transform = ([a, _, inner, _1]) => {
            return [a, inner]
        }

        iters = q.query(r, 0)
        util.inspect(iters.next())
        /////////////////


        this.src = "a(a(a()))"

        r = and()

        r.push(w('a'), w('('),q.zero1(r), w(')'))

        iters = q.query(r, 0)
        util.inspect(iters.next())
    }
}

(new ParserRec()).run()
