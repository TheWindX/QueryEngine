let util = require('util')

const callstack = () => {
    var stack = new Error().stack;
    return stack.toString()
}

const inspect = (x) => {
    console.log(util.inspect(x, false, 15))
}

const deepEqual = function (x, y) {
    if ((typeof x == "object" && x != null) && (typeof y == "object" && y != null)) {
        if (Object.keys(x).length != Object.keys(y).length) 
            return false;
        
        for (var prop in x) {
            if (y.hasOwnProperty(prop)) {
                if (!deepEqual(x[prop], y[prop])) 
                    return false;
                }
            else 
                return false;
            }
        
        return true;
    } else if (x !== y) 
        return false;
    else 
        return true;
    }

module.exports = {
    callstack,
    inspect,
    deepEqual
}