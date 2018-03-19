const util = require('./util')

const ParserBase = require('./parserBase')
const PyToken = require('./pyToken')

class PyBlock {
    constructor(margin, supLine){
        this.margin = margin
        this.supLine = supLine
        this.pyLines = []
    }

    push(pyLine) {
        this.pyLines.push(pyLine)
    }

    toString(n){
        return this.pyLines.map(line=>line.toString(n)).join('\n')
    }
}

class PyLine {
    constructor(supBlock){
        this.supBlock = supBlock
        this.subBlock = null
    }

    setStruct(pyStruct){
        this.pyStruct = pyStruct
    }

    toString(n){
        let r = ' '.repeat(n)+this.pyStruct.toString()+'\n'
        if(this.subBlock){
            r += this.subBlock.toString(n+2)
        }
        return r
    }
}

class PyStruct {
    constructor(from, to){
        this.from = from
        this.to = to
    }

    toString(){
        return `from:${this.from},to:${this.to}`
    }
}

class PyMargin extends PyStruct{
    constructor(from, to, margin){
        super(from, to)
        this.margin = margin
    }

    toString(){
        return this.margin
    }
}

class PyImMod extends PyStruct{
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

class PyImFrom extends PyStruct{
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

class PyDef extends PyStruct {
    constructor(f, t, defName, args) {
        super(f, t)
        this.defName = defName
        this.args = args
    }

    toString(){
        return `def ${this.defName}(${this.args.join(', ')}):`
    }
}

class PyClass extends PyStruct {
    constructor(f, t, className, superClasses) {
        super(f, t)
        this.className = className
        this.superClasses = superClasses
    }

    toString(){
        return `class ${this.className}(${this.superClasses.join(', ')}):`
    }
}

class pyIf extends PyStruct {
    constructor(f, t, contents) {
        super(f, t)
        this.contents = contents
    }

    toString(){
        return `if ...:`
    }
}

class PyElif extends PyStruct {
    constructor(f, t, contents) {
        super(f, t)
        this.contents = contents
    }

    toString(){
        return `elif ...:`
    }
}

class PyElse extends PyStruct {
    constructor(f, t) {
        super(f, t)
    }

    toString(){
        return `else:`
    }
}

class PyWhile extends PyStruct {
    constructor(f, t, contents) {
        super(f, t)
        this.contents = contents
    }

    toString(){
        return `while ${this.contents.toString()}:`
    }
}

class pyFor extends PyStruct {
    constructor(f, t, content) {
        super(f, t)
        this.content
    }

    toString(){
        return `for (...}):`
    }
}

class PyExpr extends PyStruct { // TODO, (instant value), apply, var, operExpr ...
    constructor(f, t){
        super(f, t)
    }
}

class PyApply extends PyExpr {
    constructor(f, t, chainName, paras){
        super(f, t)
        this.chainName = chainName
        this.paras = paras // pyExprs
    }

    toString() {
        return `${this.chainName.toString()}(${this.paras.map(p=>p.toString()).join(',')})`
    }
}

class PyChainVar extends PyExpr {
    constructor(f, t, chainName){
        super(f, t)
        this.chainName = chainName
    }

    toString() {
        return this.chainName.join('.')
    }
}

class PyOther extends PyExpr { // consume invalid(currently) tokens
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
        // info of every line
        this.pyLines = []

        // the top block struct
        this.pyTopBlock = null

        // construct parser 
        let q = this.q
        let all = q.all
        let any = q.any
        let not = q.not
        let until = this.until

        let w = (str) => q.make((idx) => {
            let v = this.src[idx]
            if (v === undefined) 
                return null
            if (v.tag == 'str') {
                if(v.value === str){
                    return [idx + 1,
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

        let pmargin = tag('margin')
        pmargin.transform = (tok, f, t)=>{
            return new PyMargin(f, t, tok.value)
        }

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
            return new PyDef(f, t, defName.value, args.map(arg=>arg.value))
        }

        // class C(S1, S2):
        let pclass = q.all(w('class'), tag('var'), w('('), this.split(tag('var'), w(',')), w(')'), w(':'))
        pclass.transform = ([_, className, _1, supClasseNames], f, t)=>{
            return new PyClass(f, t, className.value, supClasseNames.map(arg=>arg.value))
        }

        //expressions
        let papply = all()
        let pother = all()
        let pChainVar = all()
        let pExpr = any(papply, pChainVar, pother)
        pExpr.transform = ([eidx, v])=>{
            return v
        }
        
        let pif = all()
        let pelif = all()
        let pelse = all()
        let pwhile = all()
        let pfor = all()

        pif.push(w('if'), until(w(':')), w(':'));
        pif.transform = ([_, contents, _1], f, t)=>{
            return new pyIf(f, t, contents)
        }

        pelif.push(w('elif'), until(w(':')), w(':'));
        pelif.transform = ([_, contents, _1], f, t)=>{
            return new PyElif(f, t, contents)
        }

        pelse.push(w('else'), w(':'));
        pelse.transform = (v, f, t)=>{
            return new PyElse(f, t)
        }

        pwhile.push(w('while'), until(w(':')), w(':'))
        pwhile.transform = ([_, contents, _1], f, t)=>{
            return new PyWhile(f, t, contents)
        }

        pfor.push(w('for'), until(w(':')), w(':'))
        pfor.transform = ([_, content, _1], f, t)=>{
            return new pyFor(f, t, content)
        }

        // var `(  split(expr, ',' )                `)
        let paras = this.split(pExpr, w(','))
        papply.push(pChainVar, w('('), paras, w(')'))
        papply.transform = ([chainName, _, ps], f, t) => {
            return new PyApply(f, t, chainName, ps)
        }

        pChainVar.push(this.split(tag('var'), w('.')))
        pChainVar.transform = ([vs], f, t)=>{
            return new PyChainVar(f, t, vs.map(v=>v.value))
        }
        
        // papply.transform = ([var_, l_, inners, r_])=>[var_, inners]
        pother.push(this.step, q.not(this.eof))
        pother.transform = (v, f, t)=>{
            return new PyOther(f, t, this.src[f])
        }

        let pexpression = q.any(pif, pelif, pelse, pfor, pwhile, pimport, pfrom, papply, pdef, pclass, pmargin, pother)
        this.pFile = q.many(pexpression)
    }

    parse() {
        let q = this.q
        let iters = q.query(this.pFile, 0)
        this.pyLines = iters.next().value[1].map(([eidx, v])=>v)
        this.pyLines.unshift(new PyMargin(0, 0, ''));

        let pyStructs = this.pyLines
        this.pyLines = []

        // skip needless words (currently)
        for(let struct of pyStructs){
            if(!(struct instanceof PyOther)){
                this.pyLines.push(struct)
            }
        }

        // uniq the adjacent
        pyStructs = this.pyLines
        this.pyLines = []
        let lastStruct = null
        for(let struct of pyStructs){
            if(struct instanceof PyMargin){
                if(lastStruct instanceof PyMargin){
                    this.pyLines.pop()
                    struct.from = lastStruct.from
                    this.pyLines.push(struct)
                } else {
                    this.pyLines.push(struct)
                }
            } 
            else {
                this.pyLines.push(struct)
            }
            lastStruct = struct
        }
        // scructs -> block
        this.genBlocks()
        
        //util.inspect(this.pyLines.map(struct=>struct.toString()))

        //console.log(this.pyTopBlock.toString(0))
        //util.inspect(this.pyTopBlock)
    }

    // construct blocks
    genBlocks() {
        let startMargin = this.pyLines[0].margin
        let curBlock = new PyBlock(startMargin, null)
        this.pyTopBlock = curBlock

        let curLine = null

        let lines = []
        for(let pyStruct of this.pyLines){
            if(pyStruct instanceof PyMargin){
                if(pyStruct.margin === curBlock.margin){
                    curLine = new PyLine(curBlock)
                    curBlock.push(curLine)
                } else if(pyStruct.margin.length > curBlock.margin.length){
                    lines.push(curLine)
                    let block = new PyBlock(pyStruct.margin, curLine)
                    curLine.subBlock = block
                    curBlock = block
                    curLine = new PyLine(curBlock)
                    curBlock.push(curLine)
                } else if(pyStruct.margin.length < curBlock.margin.length){
                    if(lines.length == 0){
                        //console.error(`error indentation in of ${curBlock.margin.length}`)
                        continue
                    } else {
                        let lastLine = lines[lines.length-1]
                        let lastIden = lastLine.supBlock.margin.length
                        let curIden = pyStruct.margin.length
                        if(lastIden === curIden){
                            curLine = lines.pop()
                            curBlock = curLine.supBlock
                            curLine = new PyLine(curBlock)
                            curBlock.push(curLine)
                        } else {
                            //console.error(`block indent:${lastIden} != current ident:${curIden}`)
                        }
                    }
                }
            } else {
                curLine.setStruct(pyStruct)
            }
        }
    }
}

module.exports = PyParser