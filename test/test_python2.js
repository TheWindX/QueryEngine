let assert = require('assert')
let util = require('../src/util')
let dataPython = require('./data_python')
let PyParser = require('../src/pyParser')

let parser = (new PyParser(dataPython.data1));

parser.parse()