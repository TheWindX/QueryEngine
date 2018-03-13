let util = require('util')

let callstack = ()=> {
    var stack = new Error().stack;
    return stack.toString()
}

let inspect = (x)=>{
    console.log(util.inspect(x, false, 5))
}

module.exports = {callstack, inspect}