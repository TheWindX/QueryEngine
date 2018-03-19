let assert = require('assert')
let util = require('../src/util')
let dataPython = require('./dataPython')
let PyParser = require('../src/pyParser')

for(let i = 0; i<100; ++i){
    let parser = (new PyParser(dataPython.data1));
    parser.parse()
}


console.log('----------------------------------------------pass test python')