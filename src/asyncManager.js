
class AsyncManager {
    constructor(){
        this.modules = new Map() // [MODULE:[FNAME] ]
        this.funcMap = new Map() // [asfunc:[mod, func]]
        this.modMaps = new Map() // [asMod:mod]]

        this.registMod('sprite', ['move_steps', 'play'])
    }

    registMod(modName, funcNames) {
        let funcs = this.modules.get(modName)
        if(funcs) {
            console.error(`regist duplicate module of ${modName}`)
        }
        this.modules.set(modName, funcNames)
        //this.modMaps.set(modName, modName)
    }

    importMod(modMaps){
        for(let xys of modMaps){
            let modName = xys[0]
            let asName = xys[1]
            let modName1 = this.modMaps.get(asName)
            if(modName1 !== undefined){
                console.error(`module ${modName1}:${asName} has been import`)
                continue
            }
            if(this.modules.get(modName) == undefined){
                console.error(`module ${modName} doesn't exist`)
                continue
            }
            this.modMaps.delete(modName)
            this.modMaps.set(asName, modName)
        }
    }

    fromMod(modName, funcMap){
        let funcs = this.modules.get(modName)
        if(funcs === undefined){
            console.error(`module ${modName} doesn't exist!`)
            return false
        }

        if(!funcMap || funcMap.length == 0){
            for(let func of funcs){
                let modFunc = this.funcMap.get(func)
                if(modFunc){
                    console.error(`${modFunc.mod}.${modFunc.func} has been import from!`)
                }
                this.funcMap.set(func, {mod:modName, func})
            }
        } else {
            for(let [func, asFunc] of funcMap){
                let modFunc = this.funcMap.get(asFunc)
                if(modFunc){
                    console.error(`${modFunc.mod}.${modFunc.func} has been import from!`)
                }
                let idx = funcs.indexOf(func)
                if(idx == -1){
                    console.error(`no function of ${modName}.${func} has been regist!`)
                    continue
                }
                modFunc = {mod:modName, func: func}
                this.funcMap.set(asFunc, modFunc)
            }
        }
        return true
    }

    queryFuncName(chainNames){
        let mod // truely module name
        let asFuncName = chainNames.slice(chainNames.length-1)[0]
        let asModName =  chainNames.slice(0, chainNames.length-1).join('.')
        if(asModName === ''){
            let modFunc = this.funcMap.get(asFuncName)
            if(modFunc) return true
            mod = asFuncName
        } else {
            mod = this.modMaps.get(asModName)
            if(!mod) {
                console.warn(`no found module of ${asModName}!`)
                return false
            }
        }

        let funcs = this.modules.get(mod)
        if(funcs === undefined){
            console.warn(`no found module function of ${chainNames.join('.')}!`)
            return false
        }
        if(funcs.indexOf(asFuncName) !== -1) return true
        return false
    }
}

module.exports = new AsyncManager()