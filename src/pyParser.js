const util = require('./util')

const ParserBase = require('./parserBase')
const PyToken = require('./pyToken')
const asyncManager = require('./asyncManager')

class PyBlock {
    constructor(margin, supLine) {
        this.margin = margin
        this.supLine = supLine
        this.pyLines = []
    }

    push(pyLine) {
        this
            .pyLines
            .push(pyLine)
    }

    toString(n) {
        return this
            .pyLines
            .map(line => line.toString(n))
            .join('\n')
    }
}

class PyLine {
    constructor(supBlock) {
        this.supBlock = supBlock
        this.subBlock = null
        this.structs = []
    }

    isAsync() {
        return false
    }

    pushStruct(pyStruct) {
        this
            .structs
            .push(pyStruct)
    }

    toString(n) {
        let r = ' '.repeat(n) + this
            .structs
            .map(s => s.toString())
            .join('...') + '\n'
        if (this.subBlock) {
            r += this
                .subBlock
                .toString(n + 2)
        }
        return r
    }
}

class PyStruct {
    constructor(from, to) {
        this.from = from
        this.to = to
        this.asyncCache = undefined
    }

    toString() {
        return `from:${this.from},to:${this.to}`
    }

    preString(struct1, struct2, parser) {
        let tok1, tok2, idx1, idx2;
        idx1 = 0
        idx2 = parser.textSrc.length

        if(struct1){
            tok1 = parser.src[struct1.to]
            idx1 = tok1.from
        }
            
        if(struct2){
            tok2 = parser.src[struct2.from]
            idx2 = tok2.from
        }

        let r = parser.textSrc.slice(idx1, idx2)
        return r
    }

    isLoop() {
        return false
    }

    isAsync() {
        return false
    }
}

class PyNop extends PyStruct {
    constructor(from, to) {
        super(from, to)
    }

    isAsync() {
        return false
    }

    toString() {
        return `yield makeblock.nop`
    }
}

class PyMargin extends PyStruct {
    constructor(from, to, margin) {
        super(from, to)
        this.margin = margin
    }

    toString() {
        return this.margin
    }
}

class PyImMod extends PyStruct {
    constructor(f, t, xys) {
        super(f, t)
        this.xys = []
        this
            .xys
            .push(...xys)
    }

    toString() {
        let packages = this
            .xys
            .map((xy) => {
                let [x,
                    y] = xy
                if (y) {
                    return `${x} as ${y}`
                }
                return x
            })
            .join(', ')

        return `import ${packages}`
    }
}

class PyImFrom extends PyStruct {
    constructor(f, t, mod, xys) {
        super(f, t)
        this.mod = mod
        this.xys = xys // and functions if xys == null
    }

    toString() {
        let packages = this
            .xys
            .map((xy) => {
                let [x,
                    y] = xy
                if (y) {
                    return `${x} as ${y}`
                }
                return x
            })
            .join(', ')

        return `from ${this.mod} import ${packages}`
    }
}

class PyDef extends PyStruct {
    constructor(f, t, defName, args) {
        super(f, t)
        this.defName = defName
        this.args = args
    }

    toString() {
        return `def ${this
            .defName}(${this
            .args
            .join(', ')}):`
    }
}

class PyClass extends PyStruct {
    constructor(f, t, className, superClasses) {
        super(f, t)
        this.className = className
        this.superClasses = superClasses
    }

    toString() {
        return `class ${this
            .className}(${this
            .superClasses
            .join(', ')}):`
    }
}

class pyIf extends PyStruct {
    constructor(f, t, contents) {
        super(f, t)
        this.contents = contents
    }

    toString() {
        return `if ...:`
    }
}

class PyElif extends PyStruct {
    constructor(f, t, contents) {
        super(f, t)
        this.contents = contents
    }

    toString() {
        return `elif ...:`
    }
}

class PyElse extends PyStruct {
    constructor(f, t) {
        super(f, t)
    }

    toString() {
        return `else:`
    }
}

class PyWhile extends PyStruct {
    constructor(f, t, contents) {
        super(f, t)
        this.contents = contents
    }

    isLoop() {
        return true
    }

    toString() {
        return `while ${this
            .contents
            .toString()}:`
    }
}

class PyFor extends PyStruct {
    constructor(f, t, content) {
        super(f, t)
        this.content
    }

    isLoop() {
        return true
    }

    toString() {
        return `for (...):`
    }
}

class PyExpr extends PyStruct { // TODO, (instant value), apply, var, operExpr ...
    constructor(f, t) {
        super(f, t)
    }
}

class PyApply extends PyExpr {
    constructor(f, t, chainName, paras) {
        super(f, t)
        this.chainName = chainName
        this.paras = paras // pyExprs
    }

    toString() {
        return `${this
            .chainName
            .toString()}(${this
            .paras
            .map(p => p.toString())
            .join(',')})`
    }
}

class PyApplys extends PyExpr {
    constructor(f, t, applys) {
        super(f, t)
        this.applys = applys
    }

    isAsync() {
        if (this.asyncCache != undefined) 
            return this.asyncCache
        let appHead = this.applys[0]
        //console.log('appHead', appHead)
        let chainNameArr = appHead.chainName.chainName
        this.asyncCache = asyncManager.queryFuncName(chainNameArr)
        return this.asyncCache
    }

    toString() {
        let body = `${this
            .applys
            .map(p => p.toString())
            .join('.')}`
        if (this.isAsync()) {
            return `(yield ${body})`
        } else {
            return body
        }
    }
}

class PyChainVar extends PyExpr {
    constructor(f, t, chainName) {
        super(f, t)
        this.chainName = chainName
    }

    toString() {
        return this
            .chainName
            .join('.')
    }
}

class PyOther extends PyExpr { // consume invalid(currently) tokens
    constructor(f, t, tokenStr) {
        super(f, t)
        this.tokenStr = tokenStr
    }

    toString() {
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
        this.pyDecoratedStruct = [] // 被修饰需要处理的py结构
        this.pyImports = []
        // the top block struct
        this.pyTopBlock = null

        // construct parser
        let q = this.q
        let and = q.and
        let or = q.or
        let not = q.not
        let until = this.until
        let till = this.till
        let split = this.split
        let split1 = this.split1

        let w = (str) => q.make((idx) => {
            let v = this.src[idx]
            if (v === undefined) 
                return null
            if (v.tag == 'str') {
                if (v.value === str) {
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

        let pmargin = tag('margin')
        pmargin.transform = (tok, f, t) => {
            return new PyMargin(f, t, tok.value)
        }

        //import (x [as y])+ x [as y]
        let xy = q.and(tag('var'), q.zero1(q.and(w('as'), tag('var'))));

        xy.transform = ([v1, v2]) => {
            let r1 = v1.value
            if (v2) {
                let [_, {
                        value : r2
                    }
                ] = v2
                return [r1, r2]
            }
            return [r1, r1]
        }

        let pimport = q.and(w('import'), this.split1(xy, w(',')))
        pimport.transform = ([
            _, xys
        ], f, t) => {
            return new PyImMod(f, t, xys)
        }

        // from mod import (* | (x [as y])+)
        let pfrom = q.and(w('from'), tag('var'), w('import'), q.or(w('*'), this.split1(xy, w(','))))
        pfrom.transform = ([
            from, {
                value: mod
            },
            im,
            [eidx, starOrXys]
        ], f, t) => {
            if (starOrXys == "*") {
                return new PyImFrom(f, t, mod, [])
            } else {
                return new PyImFrom(f, t, mod, starOrXys)
            }
        }

        // def var (var, (','var)* ):
        let pdef = q.and(w('def'), tag('var'), w('('), this.split(tag('var'), w(',')), w(')'), w(':'))
        this.pdef = pdef
        pdef.transform = ([
            _, defName, _1, args
        ], f, t) => {
            return new PyDef(f, t, defName.value, args.map(arg => arg.value))
        }

        // class C(S1, S2):
        let pclass = q.and(w('class'), tag('var'), w('('), this.split(tag('var'), w(',')), w(')'), w(':'))
        pclass.transform = ([
            _, className, _1, supClasseNames
        ], f, t) => {
            return new PyClass(f, t, className.value, supClasseNames.map(arg => arg.value))
        }

        //expressions
        let papply = and()
        let pChainApply = and()
        let pother = and()
        let pChainVar = and()
        let pExpr = or(pChainApply, pChainVar, pother)
        pExpr.transform = ([eidx, v]) => {
            return v
        }

        let pif = and()
        let pelif = and()
        let pelse = and()
        let pwhile = and()
        let pfor = and()

        pif.push(w('if'), till(w(':')));
        pif.transform = ([
            _, contents, _1
        ], f, t) => {
            return new pyIf(f, t, contents)
        }

        pelif.push(w('elif'), till(w(':')));
        pelif.transform = ([
            _, contents, _1
        ], f, t) => {
            return new PyElif(f, t, contents)
        }

        pelse.push(w('else'), w(':'));
        pelse.transform = (v, f, t) => {
            return new PyElse(f, t)
        }

        pwhile.push(w('while'), till(w(':')))
        pwhile.transform = ([
            _, contents, _1
        ], f, t) => {
            return new PyWhile(f, t, contents)
        }

        pfor.push(w('for'), till(w(':')))
        pfor.transform = ([
            _, content, _1
        ], f, t) => {
            return new PyFor(f, t, content)
        }

        // var `(  split(expr, ',' )                `)
        let paras = this.split(pExpr, w(','))
        papply.push(pChainVar, w('('), paras, w(')'))
        papply.transform = ([
            chainName, _, ps
        ], f, t) => {
            return new PyApply(f, t, chainName, ps)
        }

        pChainApply.push(this.split1(papply, w('.')))
        pChainApply.transform = ([vs], f, t) => {
            return new PyApplys(f, t, vs)
        }

        pChainVar.push(this.split1(tag('var'), w('.')))
        pChainVar.transform = ([vs], f, t) => {
            return new PyChainVar(f, t, vs.map(v => v.value))
        }

        // papply.transform = ([var_, l_, inners, r_])=>[var_, inners]
        pother.push(this.step, q.not(this.eof))
        pother.transform = (v, f, t) => {
            return new PyOther(f, t, this.src[f])
        }

        let pexpression = q.or(pif, pelif, pelse, pfor, pwhile, pimport, pfrom, pChainApply, pdef, pclass, pmargin, pother)
        this.pFile = q.many(pexpression)
    }

    parse() {
        let q = this.q
        let iters = q.query(this.pFile, 0)
        this.pyLines = iters
            .next()[1]
            .map(([eidx, v]) => v)
        this
            .pyLines
            .unshift(new PyMargin(0, 0, ''));

        let pyStructs = this.pyLines
        this.pyLines = []

        // skip needless words (currently)
        for (let struct of pyStructs) {
            if (!(struct instanceof PyOther)) {
                this
                    .pyLines
                    .push(struct)
            }
        }

        // uniq the adjacent
        pyStructs = this.pyLines
        this.pyLines = []
        let lastStruct = null
        for (let struct of pyStructs) {
            if (struct instanceof PyMargin) {
                if (lastStruct instanceof PyMargin) {
                    this
                        .pyLines
                        .pop()
                    struct.from = lastStruct.from
                    this
                        .pyLines
                        .push(struct)
                } else {
                    this
                        .pyLines
                        .push(struct)
                }
            } else {
                this
                    .pyLines
                    .push(struct)
            }
            lastStruct = struct
        }
        // scructs -> block
        this.genBlocks()

        //util.inspect(this.pyLines.map(struct=>struct.toString()))

        console.log(this.reconstrct())
        //util.inspect(this.pyTopBlock)
    }

    // construct blocks
    genBlocks() {
        let startMargin = this.pyLines[0].margin
        let curBlock = new PyBlock(startMargin, null)
        this.pyTopBlock = curBlock

        let curLine = null

        let lines = []
        let async = false
        let loop = false
        for (let pyStruct of this.pyLines) {
            if (pyStruct instanceof PyMargin) {
                if (pyStruct.margin === curBlock.margin) {
                    curLine = new PyLine(curBlock)
                    curBlock.push(curLine)
                } else if (pyStruct.margin.length > curBlock.margin.length) { // inner block
                    lines.push(curLine)
                    async = false
                    let block = new PyBlock(pyStruct.margin, curLine)
                    curLine.subBlock = block
                    curBlock = block
                    curLine = new PyLine(curBlock)
                    curBlock.push(curLine)
                } else if (pyStruct.margin.length < curBlock.margin.length) { // outter block
                    if (lines.length == 0) {
                        continue
                    } else {
                        // find same margin
                        let matchIdx = -1
                        let curIden = pyStruct.margin
                        for (let i = lines.length - 1; i > -1; --i) {
                            let line = lines[i]
                            let lastIden = line.supBlock.margin
                            if (lastIden === curIden) {
                                matchIdx = i
                                break
                            }
                        }

                        if (matchIdx == -1) {
                            console.error(`error indentation in of ${curBlock.margin.length}`)
                            continue //warning, margin is wrong
                        }

                        let lastLine = lines[matchIdx]
                        while (lines.length != matchIdx) {
                            if (loop && !async) { //loop 且 未有async过程, 插入async.nop
                                loop = false
                                async = true
                                let structs = curBlock.supLine.structs
                                let lastStruct = structs[structs.length-1]
                                let newLine = new PyLine(curBlock)
                                curBlock.pyLines.unshift(newLine)
                                let nextStruct = curBlock.pyLines[1].structs[0]
                                let struct = new PyNop(nextStruct.from, lastStruct.to) // NOTE， from > to
                                this.pyDecoratedStruct.push(struct)
                                newLine.structs.push(struct)
                            }
                            
                            curLine = lines.pop()
                            curBlock = curLine.supBlock
                        }
                        curLine = new PyLine(curBlock)
                        curBlock.push(curLine)
                    }
                }
            } else {
                if (pyStruct instanceof PyImMod) {
                    asyncManager.importMod(pyStruct.xys)
                    this.pyDecoratedStruct.push(pyStruct)
                } else if (pyStruct instanceof PyImFrom) {
                    asyncManager.fromMod(pyStruct.mod, pyStruct.xys)
                    this.pyDecoratedStruct.push(pyStruct)
                }
                if (pyStruct.isAsync()) {
                    this.pyDecoratedStruct.push(pyStruct);
                    async = true
                } else if (pyStruct.isLoop()) {
                    loop = true
                } else if(pyStruct instanceof PyDef) { //如果pyDef
                    if(async) {
                        asyncManager.registFunc('', pyStruct.defName)
                    }
                }
                curLine.pushStruct(pyStruct)
            }
        }
    }

    reconstrct() {
        let r = ''
        let lastStruct = undefined
        for(let struct of this.pyDecoratedStruct){
            if(struct instanceof PyImMod){
                this.pyImports.push(struct)
                lastStruct = struct
            } else if(struct instanceof PyImFrom){
                lastStruct = struct
            } else {
                console.log(struct.toString(0))
                r += struct.preString(lastStruct, struct, this)
                r += struct.toString(0)
                lastStruct = struct
            }
        }
        r += lastStruct.preString(lastStruct, undefined, this);
        return r
    }
}

module.exports = PyParser