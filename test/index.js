let assert = require('assert')
const q = require('../src/query.js')
let util = require('util')
let inspect = (x)=>{
    let r = util.inspect(x, true, 20)
    console.log(r)
    return r
}

class Parser {
    constructor(src) {
        this.src = src
        this.idx = 0
    }

    testWord(n){
        let query = q.argument((idx)=>this.src.startsWith(n, idx)?[idx+n.length, n]:null)
        return query
    }

    testAny(a, b){
        return q.any(this.testWord(a), this.testWord(b))
    }

    testAll(a, b){
        return q.all(this.testWord(a), this.testWord(b))
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
            return [idx+1, []]
        })
        return q.until(skip, this.testWord(a))
    }

    testCut(){
        let skip = q.argument((idx)=>{
            if(idx == this.src.length) return null
            return [idx+1, []]
        })
        let f1 = q.all(this.testAny("1234", "12345"), q.until(skip, this.testAny('9999', "8888")))
        return f1
    }
}

let test = 0
let p1 = q.query((new Parser('asdfasdfasdfasdf')).testWord('asdf'), 0)
for(let i of p1){
    assert(JSON.stringify(i) == JSON.stringify([4, 'asdf']), "word compare is failed")
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

let p6 = q.query((new Parser('abcdasdf')).testUtil('asdf'), 0)
for(let i of p6){
    assert.deepStrictEqual(i, [8, 'asdf'])
    test++
    break
}
assert.equal(test, 1);test = 0

let p7 = q.query((new Parser('12345678alskdjfasdf333839999,8888a')).testCut(), 0)
assert.deepStrictEqual(p7.next().value, [28, ['1234', '9999']])
assert.deepStrictEqual(p7.next().value, [28, ['12345', '9999']])


console.log('pass all test')