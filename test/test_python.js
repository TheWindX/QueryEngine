
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
        let r = q.query(this.lines, 0)
        util.inspect(r.next().value)

    }
}

(new Parser_test(data1)).run()
