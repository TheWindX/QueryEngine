let assert = require('assert')
let util = require('../src/util')

let ParserBase = require('../src/parserBase')

class ImportInfoB {
    constructor(){
        this.infos = []
        this.modField = 0
        this.funcsField = 1
    }

    addModule(modName, funcNames){
        let info = this.infos.find(info=>info[0] == modName)
        if(!info){
            this.infos.unshift([modName, funcNames])
        }
    }

    addFunc(modName, funcName) {
        let info = this.infos.find(info=>info[this.modField] == modName)
        if(!info){
            info[this.funcsField].push(funcName)
        } else {
            this.addModule(modName, [funcName])
        }
    }
}

class PythonInfo extends ParserBase {
    constructor(src){
        super(src)
        this.len = src.len
        this.importInfo = new ImportInfoB()
        let spaceLen = 0
        let index = 0
        let inComment = false
        this.initState = {spaceLen, index, inComment}
    }

    untilStep(rule) {
        let step = this.q.argument(({spaceLen, index, inComment})=>[{spaceLen, index:index+1, inComment}, null])
        let f1 = this.q.until(step, rule);
        f1.transform = (vs, stFrom, stTo)=>{
            return this.src.slice(stFrom, stTo)
        }
        return f1
    }

    prefix() {
        let space = this.q.argument(({spaceLen, index, inComment})=>{
            let ch = this.src[index]
            if(ch == '\n'){
                return [{spaceLen:0, index:index+1, inComment}, ch]
            }
            if(/\s/.test(ch)){
                return [{spaceLen:spaceLen+1, index:index+1, inComment}, ch]
            }
            return null
        });
        let r = this.q.many(space)
        r.transform = (v, stFrom, stTo)=>{
            return stTo.spaceLen
        }
        return r
    }

    pyMultiComment() {
        //this.
    }

    pyImport() {

    }

    pyFromImport() {
        
    }

    pyTillEnd() {
        let notendl = ({spaceLen, index, inComment})=>{
            if(a == '\n') return 0
        }
        this.q.many(this.q)
    }

    run() {
        this.src = `   
        
  `
        let iter = this.q.query(this.prefix(), this.initState)
        let v = iter.next()
        assert.deepStrictEqual(v.value, [ { spaceLen: 2, index: 15, inComment: false }, 2 ])

        this.src = ""
        iter = this.q.query(this.prefix(), this.initState)
        v = iter.next()
        assert.deepStrictEqual(v.value, [ { spaceLen: 0, index: 0, inComment: false }, 0 ])

        this.src = ""
        iter = this.q.query(this.prefix(), this.initState)
        v = iter.next()
        assert.deepStrictEqual(v.value, [ { spaceLen: 0, index: 0, inComment: false }, 0 ])
    }
}

let p = new PythonInfo(``);
p.run()

console.log("----------------------------------------------pass test python2")