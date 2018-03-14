let assert = require('assert')
let util = require('../src/util')

let PaserBase = require('../src/parserBase')


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

    prefix() {
        let space = q.argument(({spaceLen, index, inComment})=>{
            let ch = this.src[index]
            if(ch == '\n'){
                return [{spaceLen:0, index:index+1, inComment}, null]
            }
            if(/\s/.test(ch)){
                return [{spaceLen:spaceLen+1, index:index+1, inComment}, null]
            }
            return null
        });

        let r = q.many(space)
        r.transform = (sps)=>{
            return sps.length
        }
        return r
    }

    run() {
        let iter = q.query(this.prefix(), this.initState)
        util.inspect(iter.next().value)
    }
}

