let assert = require('assert')
let util = require('../src/util')

let q = require('../src/query')
let PaserBase = require('../src/parserBase')

class ParserTest extends PaserBase{
    constructor(src){
        super(src)
    }

    run() {
        let t = this
        let q = t.q
        let w = t.word
        let b = t.blanks()
        let nb = t.noblanks()
        let regex = t.regex
        let step = t.step
        let follow = t.follow
        let until = t.until
        let till = t.till
        let eq = t.eq
        let all = q.all
        let any = q.any
        let not = q.not
        let many = q.many
        let tryof = q.tryof
        let l = t.line
        let ls = t.lines
        let eof = t.eof
        let split = t.split
        
        let test = (rule, n, exps) => {
            let iter = q.query(rule, n)
            for(let exp of exps){
                assert.deepStrictEqual(exp, iter.next().value)
            }
        }
        
        t.src = "abc123"
        test(w('abc'), 0, [[3, 'abc']])
        test(w('abc'), 1, [undefined])
        test(w('123'), 3, [[6, '123']])
        let r = all(any(w('a'), w('ab'), w('abc')),  any(w('123'), w('c123'), w('bc123')))
        r.transform = ([[eidx1, w1], [eidx2, w2]])=>{
            return [w1, w2]
        }
        test(r,0, [[6, ['a', 'bc123']], [6, ['ab', 'c123']], [6, ['abc', '123']]]);

        t.src = 'aaaa'
        r = many(any(w('a'), w('aa')))
        r.transform = (eidxVs)=>{
            let r = eidxVs.map(n=>n[1])
            return r
        }
        test(r, 0, [[4, ['a', 'a', 'a', 'a']], [3, ['a', 'a', 'a']],[4, ['a', 'a', 'aa']]])

        

        t.src = ''
        test(b, 0, [[0, '']])
        test(b, 1, [undefined])

        t.src = `   
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

        t.src = "asdfasdf"
        test(till(t.eof), 0, [[8, ''], undefined]);
        test(until(t.eof), 0, [[8, 'asdfasdf'], undefined]);

        t.src = `
`
        test(l, 0, [[1, '']])
        test(l, 1, [[1, '']])
        test(l, 2, [[2, '']])
        t.src = `
        asdf
        
`
        test(l, 0, [[1, '']])
        // test(ls, 0, [[23, ['','        asdf','        ','']]]) //TODO, isseul, the las
        test(ls, 0, [[23, ['','        asdf','        ']]]) //TODO, isseul, the las

        this.src="asdfxasdfxasdf"
        test(split(w('asdf'), w('x')), 0, [[14, ['asdf','asdf','asdf']]])
        test(split(w('asdf'), w('a')), 0, [[4, ['asdf']]])

        console.log('end-------------------')
        
    }
}


(new ParserTest('')).run()

console.log('----------------------------------------------pass test parser')