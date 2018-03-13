let assert = require('assert')
let util = require('../src/util')

let q = require('../src/query')
let PaserBase = require('../src/parserBase')

let {data1} = require('./data_python')

class Parser_test extends PaserBase{
    constructor(src){
        super(src)
    }

    run() {
        let r
        // let r = q.query(this.lines, 0)
        // util.inspect(r.next().value)

        //let words = q.all(this.getUntil(q.not(this.blank())), q.many(q.all(this.noblank(), this.blank())))
        //r = q.query(this.getUntil(q.not(this.blank)), 0)
        q.many(this.noblank(), this.blank())
        this.until(this.noblank())
        //r = q.query(q.all(this.until(this.noblank()), q.many(q.all(this.noblank(), this.blank(), q.cut)), 0)) //, this.blank), 0)
        r = q.query(q.many(this.noblank()), 0 ) //, this.blank), 0)
        util.inspect(r.next().value)
    }
}

(new Parser_test("asdf   asdf1   asdf2")).run()
// (new Parser_test(data1)).run()
