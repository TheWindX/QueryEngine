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
        let f = q.all(this.noblank(), this.blank(), q.cut)
        f.transform = ([w, b, n]) => w
        let f1 = q.many(f)
        let f2 = q.all(f1, this.noblank())
        f2.transform = ([nbs, nb])=>{
            return [...nbs, nb]
        }
        let r = q.query(f2, 0)
        return r
    }
}

let c = 0
let t = (new Parser_test("asdf   asdf1   asdf2")).run();
for(let i of t){
    assert.deepStrictEqual(i, [20, ['asdf', 'asdf1', 'asdf2']])
    c++
    break
}
assert.equal(c, 1);c = 0;



t = (new Parser_test(data1)).run()
for(let i of t){
    assert.equal(i[1].length, 27)
    c++
    break
}
assert.equal(c, 1);c = 0

console.log('----------------------------------------------pass test python')