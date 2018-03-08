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
            return [idx+1, []]
        })
        return q.until(skip, this.testWord(a))
    }
}


let p1 = q.query((new Parser('asdfasdfasdfasdf')).testWord('asdf'), 0)
for(let i of p1){
    assert(JSON.stringify(i) == JSON.stringify([4, 'asdf']), "word compare is failed")
    break
}

let p2 = q.query((new Parser('asdfasdfasdfasdf')).testAny('abcd','asdfas'), 0)
for(let i of p2){
    assert.deepStrictEqual(i, [6, 'asdfas'])
    break
}

p2 = q.query((new Parser('abcdasdfasdfasdfasdf')).testNot('abcd'), 0)
for(let i of p2){
    assert.fail('compare "not" failed')
    break
}

p2 = q.query((new Parser('abcdabcdasdfasdfasdfasdf')).testNot('abcd1'), 4)
for(let i of p2){
    assert.deepStrictEqual(i, [4, []])
    break
}

let p3 = q.query((new Parser('asdfasdfasdfasdf')).testAll('asdfas','dfas'), 0)
for(let i of p3){
    assert.deepStrictEqual(i, [10, ['asdfas', 'dfas']])
    break
}


let p4 = q.query((new Parser('')).testManyOne('asdf'), 0)
for(let i of p4){
    assert.fail('Many one failed')
    break
}

let p41 = q.query((new Parser('')).testMany('asdf'), 0)
for(let i of p41){
    assert.deepStrictEqual(i, [0, []])
    break
}

let p5 = q.query((new Parser('abcdasdf')).testManyOne('asdf'), 0)
for(let i of p5){
    assert.deepStrictEqual(i, [0, []])
    break
}

let p51 = q.query((new Parser('abcdasdf')).testManyOne('asdf'), 4)
for(let i of p51){
    assert.deepStrictEqual(i, [8, ['asdf']])
    break
}

let p6 = q.query((new Parser('abcdasdf')).testUtil('asdf'), 0)
for(let i of p6){
    assert.deepStrictEqual(i, [8, 'asdf'])
    break
}




console.log('pass all test')