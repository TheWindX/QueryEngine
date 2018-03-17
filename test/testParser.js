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
        let step = this.step
        let follow = this.follow
        let until = this.until
        let till = this.till
        let eq = this.eq
        let all = q.all
        let any = q.any
        let not = q.not
        
        let test = (rule, n, exps) => {
            let iter = q.query(rule, n)
            for(let exp of exps){
                assert.deepStrictEqual(exp, iter.next().value)
            }
        }
        

        this.src = "abc123"
        test(w('abc'), 0, [[3, 'abc']])
        test(w('abc'), 1, [undefined])
        test(w('123'), 3, [[6, '123']])

        this.src = ''
        test(b, 0, [[0, '']])
        test(b, 1, [undefined])

        this.src = `   
abcabc`
        test(b, 0, [[4, '   \n']])
        test(b, 1, [[4, '  \n']])
        test(b, 3, [[4, '\n']])
        test(b, 4, [[4, '']])

        test(nb, 4, [[10, 'abcabc']])
        test(nb, 5, [[10, 'bcabc']])
        
        test(regex(/bc/), 0, [[7, 'bc']])
        test(regex(/^bc/), 0, [undefined])
        
        test(step, 0, [[1, null]])
        
        test(eq(' '), 0, [[1, ' ']])
        test(eq('a'), 4, [[5,'a']])
        test(eq('x'), 4, [undefined])

        test(follow(w('a'), w('b')), 4, [[5, 'a']] )
        test(follow(w('a'), w('x')), 4, [undefined] )


        test(until(w('abc')), 0, [[4, '   \n']])
        test(all(till(w('abc')), till(w('abc'))), 1, [[10, ['abc', 'abc']]])
        test(until(w('x')), 0, [undefined])
        test(till(w('x')), 0, [undefined])



        console.log('end-------------------')
        
    }
}


(new ParserTest('')).run()

console.log('----------------------------------------------pass test parser')