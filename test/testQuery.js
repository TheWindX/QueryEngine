let assert = require('assert')
const q = require('../src/query.js')
let util = require('../src/util')
let data = require('./data.js')


let inspect = (x)=>{
    let r = util.inspect(x, true, 20)
    return r
}

class Parser {
    constructor(src) {
        this.src = src
        this.idx = 0
    }

    word(n){
        if(!n){
            let i = 0
        }
        let query = q.argument((idx)=>this.src.startsWith(n, idx)?[idx+n.length, n]:null, `'${n}'`)
        return query
    }

    testAny(...ws){
        return q.any(...ws.map(w=>this.word(w)))
    }

    testAll(...ws){
        return q.all(...ws.map(w=>this.word(w)))
    }

    testNot(){
        this.src = 'abcde'
        let iters = q.query(q.not(this.word('b')), 0)
        assert.deepStrictEqual(iters.next().value, [0, null])

        let nb = q.not(this.word('b') )
        let f = q.fail
        iters = q.query(q.all(nb, f), 0)
        assert.deepStrictEqual(iters.next().value, undefined)
    }

    testTry(){
        this.src = "asdf"
        let iters = q.query(q.tryof(this.word('a')), 0)
        assert.deepStrictEqual(iters.next().value, [0,'a'])

        this.src = "    asdf"
        iters = q.query(q.tryof(this.word('asdf')), 4)
        assert.deepStrictEqual(iters.next().value, [4,'asdf'])
    }

    testMany(a){
        return q.many(this.word(a))
    }

    testManyOne(a){
        return q.many_one(this.word(a))
    }

    testZeroOne(a){
        return q.zero_one(this.word(a))
    }


    testCut(){
        let skip = q.argument((idx)=>{
            if(idx == this.src.length) return null
            return [idx+1, []]
        }, 'skip')
        let f1 = q.all(this.testAny("1234", "12345"), q.find(skip, this.testAny('9999', "8888")), q.cut)
        return f1
    }

    testCut1(){
        let skip = q.argument((idx)=>{
            if(idx == this.src.length) return null
            return [idx+1, []]
        }, 'skip')
        let f1 = q.all(q.cut, this.testAny("1234", "12345"), this.testAny('999', "5999") )
        let f2 = q.all(this.testAny("1234", "12345"), q.cut, this.testAny('999', "5999") )
        let f3 = q.all(this.testAny("1234", "12345"), this.testAny('999', "5999"), q.cut )
        return [q.query(f1, 0), q.query(f2, 0), q.query(f3, 0)]
    }
}

let test = 0
let p1 = q.query((new Parser('asdfasdfasdfasdf')).word('asdf'), 0)
for(let i of p1){
    assert.deepStrictEqual(i, [4, 'asdf'])
    test++
    break
}
assert.equal(test, 1);test = 0


let p2 = q.query((new Parser('asdfasdfasdfasdf')).testAny('abcd','asdfas'), 0)
for(let i of p2){
    assert.deepStrictEqual(i, [6, 'asdfas'])
    test++
    break
}
assert.equal(test, 1);test = 0

let ps = new Parser('asdf');
let p22 = q.query(q.any(ps.word('asdf'), q.ok), 0)
for(let i of p22){
    assert.deepStrictEqual(i, [4, 'asdf'])
    test++
    break
}
assert.equal(test, 1);test = 0

ps.testNot()
ps.testTry()

let p3 = q.query((new Parser('asdfasdfasdfasdf')).testAll('asdfas','dfas'), 0)
for(let i of p3){
    assert.deepStrictEqual(i, [10, ['asdfas', 'dfas']])
    test++
    break
}
assert.equal(test, 1);test = 0


let p31 = q.query((new Parser('asdfasdf')).testZeroOne('asdf'), 0)
for(let i of p31){
    assert.deepStrictEqual(i, [4, 'asdf'])
    test++
    break
}
assert.equal(test, 1);test = 0

let p32 = q.query((new Parser('')).testZeroOne('asdf'), 0)
for(let i of p32){
    assert.deepStrictEqual(i, [0, null])
    test++
    break
}
assert.equal(test, 1);test = 0


let p4 = q.query((new Parser('')).testManyOne('asdf'), 0)
for(let i of p4){
    test++
    break
}
assert(test == 0);test = 0

let p41 = q.query((new Parser('')).testMany('asdf'), 0)
for(let i of p41){
    assert.deepStrictEqual(i, [0, []])
    test++
    break
}
assert.equal(test, 1);test = 0

let p5 = q.query((new Parser('abcdabcd')).testManyOne('abcd'), 0)
for(let i of p5){
    assert.deepStrictEqual(i, [8, ['abcd','abcd']])
    test++
    break
}
assert.equal(test, 1);test = 0

let p51 = q.query((new Parser('abcdasdf')).testManyOne('asdf'), 4)
for(let i of p51){
    assert.deepStrictEqual(i, [8, ['asdf']])
    test++
    break
}
assert.equal(test, 1);test = 0


let p7 = q.query((new Parser('12345678alskdjfasdf333839999,8888a')).testCut(), 0)
assert.deepStrictEqual(p7.next().value, [28, ['1234', '9999', null]])
assert.deepStrictEqual(p7.next().value, undefined)

let [p71, p72, p73] = new Parser('12345999').testCut1()
assert.deepStrictEqual(Array.from(p71), [[8, [null, "1234", "5999"]], [8, [null, "12345", "999"]]])
assert.deepStrictEqual(Array.from(p72), [[8, ["1234", null, "5999"]]] )
assert.deepStrictEqual(Array.from(p73), [[8, ["1234", "5999", null]]] )

// let p8 = q.query((new Parser(data.data)).testMany('asdf'), 0)
// assert.equal(p8.next().value[1].length, 1835)
console.log('----------------------------------------------pass test query')