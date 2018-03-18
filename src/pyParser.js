const util = require('./util')

const ParserBase = require('./parserBase')
const PyToken = require('./pyToken')

class pyStruct {
    constructor(from, to){
        this.from = from
        this.to = to
    }

    toString(){
        return `from:${this.from},to:${this.to}`
    }
}

class pyPrefix extends pyStruct{
    constructor(from, to, prefix){
        this.from = from
        this.to = to
        this.prefix = prefix
    }

    toString(){
        return `from:${this.from},to:${this.to}`
    }
}

class PyImMod extends pyStruct{
    constructor(f, t, xys) {
        super(f, t)
        this.xys = []
        this
            .xys
            .push(...xys)
    }

    toString(){
        let packages = this.xys.map((xy)=>{
            let [x, y] = xy
            if(y){
                return `${x} as ${y}`
            }
            return x
        }).join(', ')

        return  `import ${packages}`
    }
}

class PyImFrom extends pyStruct{
    constructor(f, t, mod, xys) {
        super(f, t)
        this.mod = mod
        this.xys = xys // all functions if xys == null
    }

    toString(){
        let packages = this.xys.map((xy)=>{
            let [x, y] = xy
            if(y){
                return `${x} as ${y}`
            }
            return x
        }).join(', ')

        return  `from ${this.mod} import ${packages}`
    }
}

class pyDef extends pyStruct {
    constructor(f, t, defName, args) {
        super(f, t)
        this.defName = defName
        this.args = args
    }

    toString(){
        return `def ${this.defName}(${this.args.join(', ')}):`
    }
}

class pyExpr extends pyStruct { // TODO, (instant value), apply, var, operExpr ...
    constructor(f, t){
        super(f, t)
    }
}

class pyApply extends pyExpr {
    constructor(f, t, chainName, paras){
        super(f, t)
        this.chainName = chainName
        this.paras = paras // pyExprs
    }

    toString() {
        return `${this.chainName.toString()}(${this.paras.map(p=>p.toString()).join(',')})`
    }
}

class pyChainVar extends pyExpr {
    constructor(f, t, chainName){
        super(f, t)
        this.chainName = chainName
    }

    toString() {
        return this.chainName.join('.')
    }
}

class pyOther extends pyExpr { // consume invalid(currently) tokens
    constructor(f, t, tokenStr){
        super(f, t)
        this.tokenStr = tokenStr
    }

    toString(){
        return this.tokenStr;
    }
}


class PyParser extends ParserBase {
    constructor(textSrc) {
        super('')
        this.textSrc = textSrc;
        this.src = (new PyToken(this.textSrc)).getTokens() //tokens as source
        let q = this.q
        let all = q.all
        let any = q.any
        let not = q.not

        this.pyLines = []

        let w = (str) => q.make((idx) => {
            let v = this.src[idx]
            if (v === undefined) 
                return null
            if (v.tag == 'str') {
                if(v.value === str){
                    return [
                        idx + 1,
                        v.value
                    ]    
                }
            }
            return null
        }, `${str}`)

        let tag = (t) => q.make((idx) => {
                let v = this.src[idx]
                if (v === undefined) 
                    return null
                if (v.tag == t) {
                    return [
                        idx + 1,
                        v
                    ]
                }
                return null
            }, `${t}`)

        //import (x [as y])+ x [as y]
        let xy = q.all(tag('var'), q.zero_one(q.all(w('as'), tag('var'))));

        xy.transform = ([v1, v2]) => {
            let r1 = v1.value
            if(v2){
                let [_, {value:r2}] = v2
                return [r1, r2]
            }
            return [r1]
        }

        let pimport = q.all(w('import'), this.split(xy, w(',')))
        pimport.transform = ([_, xys], f, t) => {
            return new PyImMod(f, t, xys)
        }

        // from mod import (* | (x [as y])+)
        let pfrom = q.all(w('from'), tag('var'), w('import'), q.any(w('*'), this.split(xy, w(','))))
        pfrom.transform = ([from, {value:mod}, im, [eidx, starOrXys]], f, t) => {
            if (starOrXys == "*") {
                return new PyImFrom(f, t, mod, [])
            } else {
                return new PyImFrom(f, t, mod, starOrXys)
            }
        }

        // def var (var, (','var)* ):
        let pdef = q.all(w('def'), tag('var'), w('('), this.split(tag('var'), w(',')), w(')'), w(':'))
        this.pdef = pdef
        pdef.transform = ([_, defName, _1, args], f, t)=>{
            return new pyDef(f, t, defName.value, args.map(arg=>arg.value))
        }

        //expressions
        let papply = all()
        let pother = all()
        let pChainVar = all()
        let pExpr = any(papply, pChainVar, pother)
        pExpr.transform = ([eidx, v])=>{
            return v
        }

        // var `(  split(expr, ',' )                `)
        let paras = this.split(pExpr, w(','))
        papply.push(pChainVar, w('('), paras, w(')'))
        papply.transform = ([chainName, _, ps], f, t) => {
            return new pyApply(f, t, chainName, ps)
        }

        pChainVar.push(this.split(tag('var'), w('.')))
        pChainVar.transform = ([vs], f, t)=>{
            return new pyChainVar(f, t, vs.map(v=>v.value))
        }
        
        // papply.transform = ([var_, l_, inners, r_])=>[var_, inners]
        pother.push(this.step, q.not(this.eof))
        pother.transform = (v, f, t)=>{
            return new pyOther(f, t, this.src[f])
        }

        let pexpression = q.any(pimport, pfrom, papply, pdef, tag('prefix'), pother)
        this.pFile = q.many(pexpression)
    }

    parse() {
        let q = this.q
        let iters = q.query(this.pFile, 0)
        this.pyLines = iters.next().value[1].map(([eidx, v])=>v)
        
        let lines = this.pyLines
        this.pyLines = []
        let lastLine = null
        for(let line of lines){
            if(line instanceof pyOther){
                if(lastLine instanceof pyOther){
                    this.pyLines.pop()
                    line.from = lastLine.from
                    this.pyLines.push(line)
                } else {
                    this.pyLines.push(line)
                }
            } 
            else {
                this.pyLines.push(line)
            }
            lastLine = line
        }
        
        util.inspect(this.pyLines)
        //util.inspect(this.pyLines.map(line=>line.toString()))
    }
}

module.exports = PyParser