let assert = require('assert')
let util = require('../src/util')

let q = require('../src/query')
let PaserBase = require('../src/parserBase')

class ParserTest extends PaserBase{
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
        let all = q.all
        let any = q.any

        let f = all(nb, b, q.cut)
        f.transform = ([w, b, n]) => w
        let f1 = q.many(f)
        let f2 = all(f1, nb)
        f2.transform = ([nbs, nb])=>{
            return [...nbs, nb]
        }
        
        let r = q.query(f2, 0)

        let c = 0
        let iters
        ///regex
        this.src = "    a23b"
        iters = q.query(regex(/23/), 0)
        assert.deepStrictEqual(iters.next().value, [7, "23"])

        this.src = "  23    a23b"
        iters = q.query(regex(/^23/), 2)
        assert.deepStrictEqual(iters.next().value, [4, "23"])
        

        ////until
        // this.src = "    12  "
        // iters = q.query(this.until(w('12')), 0)
        // for(let i of iters){
        //     assert.deepStrictEqual(i, [4, "    "])
        //     c++
        //     break
        // }
        // assert.equal(c, 1);c = 0

        this.src = "    12  "
        iters = q.query(this.until(w('34')), 0)
        for(let i of iters){
            console.log(i)
            assert.fail('until fail here')
            c++
            break
        }
        assert.equal(c, 0);c = 0

        this.src = "    12"
        iters = q.query(this.find(w('12')), 0)
        for(let i of iters){
            assert.deepStrictEqual(i, [6, '12'])
            c++
            break
        }
        assert.equal(c, 0);c = 0

        iters = q.query(this.find(w('41234')), 0)
        for(let i of iters){
            c++
            break
        }
        assert.equal(c, 0);c = 0

        //// line
        this.src = `
asdf`;
        iters = q.query(this.line, 0)
        for(let i of iters){
            assert.deepStrictEqual(i, [1, ''])
            c++
            break
        }
        assert.equal(c, 1);c = 0

        /// lines
        this.src = `
 
  
asdf`;
        iters = q.query(this.lines, 0)
        for(let i of iters){
            assert.deepStrictEqual(i, [10, ['', ' ', '  ', 'asdf']])
            c++
            break
        }
        assert.equal(c, 1);c = 0

        // noblanks
        this.src = "asdf  asdf1"
        iters = q.query(nb, 0)
        assert.deepStrictEqual(iters.next().value, [4, "asdf"])

        // follow
        this.src = "asdf1234"
        iters = q.query(follow(w('asdf'), w('1234')), 0)
        assert.deepStrictEqual(iters.next().value, [4, "asdf"])

        // split
        this.src = "asdf,asdf,asdf,asdf,asdf, , "
        iters = q.query(this.split(any(w('asdf'), w('ksf')), w(',')), 0)
        let v = iters.next().value
        assert.deepStrictEqual(v, [24, ["asdf", "asdf", "asdf", "asdf", "asdf"]])
    }
}


(new ParserTest('')).run()

console.log('----------------------------------------------pass test parser')