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
        let and = q.and
        let or = q.or
        let not = q.not
        let many = q.many
        let many1 = q.many1
        let zero1 = q.zero1
        let tryof = q.tryof
        let l = t.line
        let ls = t.lines
        let eof = t.eof
        let split = t.split
        
        let test = (rule, n, exps) => {
            let iter = q.query(rule, n)
            for(let exp of exps){
                let r = iter.next()
                if(!util.deepEqual(r, exp)){
                    util.inspect(r)
                    assert.deepStrictEqual(exp, r)
                }
            }
        }
        
        t.src = "abc123"
        test(w('abc'), 0, [[3, 'abc']])
        test(w('abc'), 1, [undefined])
        test(w('123'), 3, [[6, '123']])

        let r = or(w('a'), w('ab'), w('abc'))
        r.transform = ([eidx1, w])=>{
            return w
        }
        test(r,0, [[1, 'a'], [2, 'ab'], [3, 'abc']]);

        r = or(or(w('a'), w('ab')), w('abc'))
        r.transform = ([eidx, v])=>{
            if(eidx == 0){
                let [eidx1, v1] = v
                return v1
            } else {
                return v
            }
        }
        q.debug.or(true)
        test(r,0, [[1, 'a'], [2, 'ab'], [3, 'abc']]);
        q.debug.or(false)


        r = and(w('a'), w('b'), w('c'))
        test(r,0, [[3,['a', 'b', 'c']]]);

        r = and(or(w('a'), w('ab'), w('abc')),  or(w('123'), w('c123'), w('bc123')))
        r.transform = ([[eidx, v1], [eidx2, v2]])=>{
            return [v1, v2]
        }
        // r.transform = ([[eidx1, w1], [eidx2, w2]])=>{
        //     return [w1, w2]
        // }
        test(r,0, [[6, ['a', 'bc123']], [6, ['ab', 'c123']], [6, ['abc', '123']]]);

        t.src = 'aaaa'
        r = many(or(w('a'), w('aa')))
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
        test(and(till(w('abc')), till(w('abc'))), 1, [[10, ['abc', 'abc']]])
        test(until(w('x')), 0, [undefined])
        test(till(w('x')), 0, [undefined])

        t.src = `_as2`
        r = regex(/^[_a-zA-Z]([_a-zA-Z0-9]*)/)
        r.transform = (v, f, t)=>{
            return v
        }
        test(r, 0, [[4, '_as2']])

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

        this.src="a.b."
        test(split(regex('[a-b]'), w('.')), 0, [[3, ['a','b']]])
        

        this.src = "a.b.c.d(e,f()(g)).h"
        let pvar, papply, pchainExprPart, pChainApply, pchainExpr, pexpr
        pexpr = or()
        pvar = t.regex(/^[_a-zA-Z]([_a-zA-Z0-9]*)/)
        pChainApply = and(w('('), split(pexpr, w(',')), w(')'))
        pChainApply.transform = (v)=>{
            let args = v[1]
            return args
        }
        papply = and(pvar, many1(pChainApply))
        papply.transform = (v)=>{
            let m = v[0]
            let apps = v[1]
            return [m, apps]
        }
        
        pchainExprPart = or(papply, pvar)
        pchainExprPart.transform = (v)=>{
            return v[1]
        }

        pchainExpr = split(pchainExprPart, w('.'))
        pchainExpr.transform = (vs)=>{
            let prefix = false
            let r = vs.reduce((c, v)=>{
                console.log('v:', prefix, v)
                if(v instanceof Array){
                    if(!prefix){
                        c[1] = v
                    }
                    prefix = true
                } else {
                    if(prefix){
                        console.log('c2', v)
                        c[2].push(v)
                    } else {
                        c[0].push(v)
                    }
                }
                return c
            }, [[], null, []]) // [prifix, apply1, [members]]
            if(!r[1]){
                return r[0]
            } else {
                return r
            }
            return r
        }

        pexpr.push(pchainExpr, w('123'))
        pexpr.transform = (v)=>{
            let eidx = v[0]
            let v1 = v[1]
            return v1
        }
        
        //test(pchainExpr, 0, [[1]])
        



        console.log('end-------------------')
        
    }
}

(new ParserTest('')).run()


console.log('----------------------------------------------pass test parser')
