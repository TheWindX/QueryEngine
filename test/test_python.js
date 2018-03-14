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

        let c = 0
        let iters
        ///regex
        this.src = "    a23b"
        iters = this.q.query(this.regex(/23/), 0)
        assert.deepStrictEqual(iters.next().value, [7, "23"])

        this.src = "  23    a23b"
        iters = this.q.query(this.regex(/^23/), 2)
        assert.deepStrictEqual(iters.next().value, [4, "23"])
        

        ////untilStep
        this.src = "    a12asdfasdfasdf112341234"
        iters = this.q.query(this.untilStep(this.word('12')), 0)
        for(let i of iters){
            assert.deepStrictEqual(i, [5, "    a"])
            c++
            break
        }
        assert.equal(c, 1);c = 0

        iters = this.q.query(this.untilStep(this.word('41234')), 0)
        for(let i of iters){
            assert.deepStrictEqual(i, [23, '    a12asdfasdfasdf1123'])
            c++
            break
        }
        assert.equal(c, 1);c = 0

        //// line
        this.src = `
asdf`;
        iters = this.q.query(this.line(), 0)
        for(let i of iters){
            assert.deepStrictEqual(i[1], "")
            c++
            break
        }
        assert.equal(c, 1);c = 0

        /// lines
        this.src = `
 
  
asdf`;
        iters = this.q.query(this.lines(), 0)
        for(let i of iters){
            assert.deepStrictEqual(i, [10, ['', ' ', '  ', 'asdf']])
            c++
            break
        }
        assert.equal(c, 1);c = 0
    }
}


(new Parser_test('')).run()





console.log('----------------------------------------------pass test python')