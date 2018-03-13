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
        this.importInfo = new ImportInfoB()
    }

    getImport() {
        
    }

    run() {

    }
}