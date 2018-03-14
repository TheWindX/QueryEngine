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

    testWord(n){
        if(!n){
            let i = 0
        }
        let query = q.argument((idx)=>this.src.startsWith(n, idx)?[idx+n.length, n]:null, `'${n}'`)
        return query
    }

    testAny(...ws){
        return q.any(...ws.map(w=>this.testWord(w)))
    }

    testAll(...ws){
        return q.all(...ws.map(w=>this.testWord(w)))
    }

    testNot(a){
        return q.not(this.testWord(a))
    }

    testMany(a){
        return q.many(this.testWord(a))
    }

    testManyOne(a){
        return q.many_one(this.testWord(a))
    }

    testZeroOne(a){
        return q.zero_one(this.testWord(a))
    }

    testUtil(a){
        let skip = q.argument((idx)=>{
            if(idx == this.src.length) return null
            return [idx+1, null]
        }, 'skip')
        return q.until(skip, this.testWord(a))
    }

    testCut(){
        let skip = q.argument((idx)=>{
            if(idx == this.src.length) return null
            return [idx+1, []]
        }, 'skip')
        let f1 = q.all(this.testAny("1234", "12345"), q.until(skip, this.testAny('9999', "8888")), q.cut)
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
let p1 = q.query((new Parser('asdfasdfasdfasdf')).testWord('asdf'), 0)
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
let p22 = q.query(q.any(ps.testWord('asdf'), q.ok), 0)
for(let i of p22){
    assert.deepStrictEqual(i, [4, 'asdf'])
    test++
    break
}
assert.equal(test, 1);test = 0

p2 = q.query((new Parser('abcdasdfasdfasdfasdf')).testNot('abcd'), 0)

for(let i of p2){
    test++
    break
}
assert(test == 0);test = 0

p2 = q.query((new Parser('abcdabcdasdfasdfasdfasdf')).testNot('abcd1'), 4)
for(let i of p2){
    assert.deepStrictEqual(i, [4, []])
    test++
    break
}
assert.equal(test, 1);test = 0

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

let p6 = q.query((new Parser('abcdasdfasdf')).testUtil('asdf'), 0)
assert.deepStrictEqual(p6.next().value, [4, null])


let p7 = q.query((new Parser('12345678alskdjfasdf333839999,8888a')).testCut(), 0)
assert.deepStrictEqual(p7.next().value, [24, ['1234', null, null]])
assert.deepStrictEqual(p7.next().value, undefined)

let [p71, p72, p73] = new Parser('12345999').testCut1()
assert.deepStrictEqual(Array.from(p71), [[8, [null, "1234", "5999"]], [8, [null, "12345", "999"]]])
assert.deepStrictEqual(Array.from(p72), [[8, ["1234", null, "5999"]]] )
assert.deepStrictEqual(Array.from(p73), [[8, ["1234", "5999", null]]] )

// let p8 = q.query((new Parser(data.data)).testMany('asdf'), 0)
// assert.equal(p8.next().value[1].length, 1835)

console.log('----------------------------------------------pass test 1')