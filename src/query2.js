

const fail = Symbol('fail')

class Rule {
    constructor(){
        
    }

    genQuery(){
        return []
    }
}

class Query {
    constructor(rule){
        this.rule = rule
        this.instance = rule.gen()
    }

    next(st) {
        return null
    }
}

class QAtom extends Query {

}

class QAll extends Query {
    constructor(querys){
        this.querys = querys
    }
}

class QAny extends Query {

}

class Solver {
    constructor(query, st){
        this.query = query
        this.st = st
        this.stk = []
    }

    next() {
        for(;true;) {
            let res = this.query.next(this.st)
            if(res == fail) {
                if(this.stk.length == 0) return fail;
                [this.query, this.st] = this.stk.pop()
                this.query.unbind()
            } else if(s instanceof Query) {
                this.stk.push([this.query, this.value])
                this.query = s
            } 
        }
    }
}