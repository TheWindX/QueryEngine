
const q = require('./query.js')
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

    testMore(a){
        return q.many(this.testWord(a))
    }

    testMoreOne(a){
        return q.many_one(this.testWord(a))
    }

    testZeroOne(a){
        return q.zero_one(this.testWord(a))
    }
}


// let p1 = q.query((new Parser('asdfasdfasdfasdf')).test1('asdf'), 0)
// for(let i of p1){
//     inspect(i)
// }

// let p2 = q.query((new Parser('asdfasdfasdfasdf')).test2('abcd','asdfas'), 0)
// for(let i of p2){
//     inspect(i)
// }

// let p3 = q.query((new Parser('asdfasdfasdfasdf')).test3('asdfas','dfas'), 0)
// for(let i of p3){
//     inspect(i)
// }

let p4 = q.query((new Parser('')).testMoreOne('asdf'), 0)
for(let i of p4){
    inspect(i)
    break
}

let p41 = q.query((new Parser('')).testMore('asdf'), 0)
for(let i of p41){
    inspect(i)
    break
}

// let p5 = q.query((new Parser('abcdasdf')).test5('asdf'), 0)
// for(let i of p5){
//     inspect(i)
//     break
// }
// let p51 = q.query((new Parser('abcdasdf')).test5('asdf'), 4)
// for(let i of p51){
//     let k = inspect(i)
//     console.log(typeof(i))
//     break
// }

console.log('end')