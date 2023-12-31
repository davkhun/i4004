// registers
var _rx = [];
// ram area
// 8 banks
// 4 ram chip
// 4 registers
// 16 data characters
var _ram = [];
// status character ram
var _statusCharacterRam = [];
// stack for jms
var _jmsStack = [];
// accumulator
var _acc;
// carry flag
var _cc;
// instruction pointer
var _ip;
// data pointer (for ram) (0 - 15)
var _dp;
// selected ram chip (0 - 3)
var _ramChip;
// selected register line (0 - 3)
var _ramChipLine; 
// selected ram bank (0-7)
var _dataRamBank;
// instruction counter
var _counter;
// program stack
var _stack;

// initialize variables
function _init() {
    _rx = new Array(16).fill(0);
    _ram = new Array(8).fill().map(() => new Array(4).fill().map(() => new Array(4).fill().map(() => new Array(16).fill(0))));
    _statusCharacterRam = new Array(8).fill().map(() => new Array(4).fill().map(() => new Array(4).fill().map(() => new Array(4).fill(0))));
    _acc = 0;
    _cc = 0;
    _ip = 0;
    _counter = 0;
    _stack = [];
    _dp = 0;
    _dataRamBank = 0;
    _ramChip = 0;
    _ramChipLine = 0;
}

// parsing code from textarea
function parseCode(source) {
    // check for base 64
    if (isBase64(source)) {
        source = window.atob(source);
        $('#sourceCodeT').val(source);
    }
    let codeArr = source.split('\n').filter(x => x.length > 0);
    let labels = [];
    for (let line = 0; line < codeArr.length; line++) {
        // remove comments
        if (codeArr[line].includes(';') || codeArr[line].includes('/')) {
            codeArr[line] = codeArr[line].split(';')[0];
            codeArr[line] = codeArr[line].split('/')[0];
        }
        // skip empty lines after removing comments
        if (codeArr[line].lenght == 0) {
            continue;
        }

        let token = codeArr[line].split(' ');

        // remove empty params
        token = token.filter((t) => {
            return t.length > 0;
        })

        let params = [];
        // collect labels and line numbers
        if (token[0].includes(':')) {
            token[0] = token[0].slice(0, -1);
            labels.push(token[0].toLowerCase());
            params.push(line);
        }
        else {
            params = token.length == 1? null: token.slice(1);
        }
        let model = {
            opcode: token[0].toLowerCase(),
            params: params
        };
        _stack.push(model);
    }

    // second pass, replace label on jump instructions to line number
    _stack.forEach(e => {
        let paramIndex = ['jcn', 'isz'].includes(e.opcode) ? 1: 0;
        if (e.params != null && labels.includes(e.params[paramIndex])) {
            e.params[paramIndex] = _stack.find(x=>x.opcode == e.params[paramIndex]).params[0];
        }
    });

    console.log('Stack: ', _stack);
}

function isBase64(source) {
    var base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    return base64regex.test(source);
}

// get registry index from notation (r0 - r15)
function getRegisterIndex(registry) {
    return parseInt(registry.slice(1));
}

// get register pair from notation (0p - 7p) 
function getRegisterPair(registerPair) {
    let firstRegister = parseInt(registerPair[0]);
    if (firstRegister > 7) {
        alert(`Wrong register pair at ip: ${_ip}`);
        return {
            rx1: 0,
            rx2: 1
        }
    }
    return {
        rx1: firstRegister * 2,
        rx2: firstRegister * 2 + 1
    };
}

// execute program
function execute() {
    let endless = false;
    for (_ip=0; _ip < _stack.length; _ip++) {
        step(_stack[_ip]);
        _counter++;
        if (_counter > 10000) {
            endless = true;
            break;
        }
    }
    if (endless) {
        alert('Over 10000 cycles. Break program to prevent endless looping');
    }
}

// execute step of the program
function step(line) {
    let params = line.params;
    try {
        eval(line.opcode)(params);
    }
    catch (e) {
        // there was a label or unknown command
    }

}

// -------------------------------

// INSTRUCTIONS

// INDEX REGISTER INSTRUCTIONS

// increment register
function inc(params) {
    let index = getRegisterIndex(params[0]);
    _rx[index] = (_rx[index] + 1) & 0xf;
}

// TODO:
// fetch indirect on RP
function fin(params) {

}

// INDEX REGISTER TO ACCUMULATOR INSTRUCTIONS

// add register to accumulator
function add(params) {
    let index = getRegisterIndex(params[0]);
    _acc = _acc + _rx[index] + _cc;
    _cc = _acc >> 4;
    _acc = _acc & 0xf;
}


// substract register from accumulator with borrow
function sub(params) {
    let index = getRegisterIndex(params[0]);
    _acc = _acc + (_cc == 0? 1: 0) + ~(_rx[index]);
    _cc = _acc > 0? 1: 0;
    _acc = _acc & 0xf;
}

// load accumulator from specific register
function ld(params) {
    let index = getRegisterIndex(params[0]);
    _acc = _rx[index];
}

// exchange register and accumulator
function xch(params) {
    let tmp = _acc;
    let index = getRegisterIndex(params[0]);
    _acc = _rx[index];
    _rx[index] = tmp;
}

// ACCUMULATOR INSTRUCTIONS

// clear both (carry & accumulator)
function clb() {
    _cc = 0;
    _acc = 0;
}

// clear carry
function clc() {
    _cc = 0;
}

// increment accumulator (carry affected)
function iac() {
    _acc = (_acc + 1) & 0xf;
    _cc = _acc == 0? 1: 0;
}

// complement carry (inverse)
function cmc() {
    _cc = _cc ^ 1;
}

// complement accumulator (inverse)
function cma() {
    _acc = _acc ^ 0xf;
}

// rotate accumulator left through carry
function ral() {
    _acc = (_acc << 1) + _cc;
    _cc = _acc >> 4;
    _acc = _acc & 0xf;
}

// rotate accumulator right through carry
function rar() {
    let cc = _acc & 1;
    _acc = (_acc >> 1) + (_cc << 3);
    _cc = cc;
}

// transmit carry and clear
function tcc() {
    _acc = _cc;
    _cc = 0;
}

// decrement accumulator
function dac() {
    _acc = (_acc - 1) & 0xf;
    _cc = _acc != 15? 1: 0;
}

// transfer carry substract (for subract decimal numbers greater than 4 bits in lenght)
function tcs() {
    _acc = 9 + _cc;
    _cc = 0;
}

// set carry
function stc() {
    _cc = 1;
}

// decimal adjust accumulator
function daa() {
    if (_acc > 9 || _cc == 1) {
        _acc += 6;
    }
    if (_acc >= 16) {
        _cc = 1;
        _acc -= 16;
    }
}

// keyboard process
function kbp() {
    if (_acc > 4) {
        _acc = 15;
    }
}

// IMMEDIATE INSTRUCTIONS


// fetch immediate
function fim(params) {
    let rp = getRegisterPair(params);
    let numbers = params[1].slice(1);
    _rx[rp.rx1] = parseInt(numbers[0],16);
    if (numbers.length > 1) {
        _rx[rp.rx2] = parseInt(numbers[1],16);
    }
}

// load accumulator
function ldm(params) {
    _acc = params[0] & 0xf;
}


// TRANSFER OF CONTROL INSTRUCTIONS

// jump unconditionally
function jun(params) {
    _ip = params[0];
}

// jump indirect
// TODO: realize on register pairs
function jin(params) {

}

// jump on condition
function jcn(params) {
    let op = params[0];
    if (!['c0', 'c1', 'az', 'an'].includes(op)) {
        return;
    }
    if (op[0] == 'c') {
        if (_cc != parseInt(op[1])) {
            return;
        }
    }
    else if (op == 'az' && _acc != 0) {
        return;
    }
    else if (op == 'an' && _acc == 0) {
        return;
    }
    _ip = params[1];
}

// increment register and skip if zero
function isz(params) {
    let index = getRegisterIndex(params[0]);
    _rx[index] = (_rx[index] + 1) & 0xf;
    if (_rx[index] != 0) {
        _ip = params[1];
    }
}

// SUBROUTINE LINKAGE COMMANDS

// jump to subroutine
function jms(params) {
    _jmsStack.push(_ip);
    _ip = params[0];
}

// branch back and load
function bbl(params) {
    _ip = _jmsStack.pop();
    _acc = params[0] & 0xf;
}

// NOP INSTRUCTION NO OPERATION

function nop() {
    return;
}

// MEMORY SELECTION INSTRUCTIONS

// designate command line
function dcl() {
    _dataRamBank = _acc & 0x7;
}

// send register control
function src(params) {
    let rp = getRegisterPair(params);
    _dp = _rx[rp.rx2];
    _ramChipLine = _rx[rp.rx1] & 0x3;
    _ramChip = _rx[rp.rx1] >> 2;
}

// INPUT/OUTPUT RAM INSTRUCTIONS

// read data memory character
function rdm() {
    _acc = _ram[_dataRamBank][_ramChip][_ramChipLine][_dp];
}

// read data ram status character
function rd0() {
    _acc = _statusCharacterRam[_dataRamBank][_ramChip][_ramChipLine][0];
}

// read data ram status character
function rd1() {
    _acc = _statusCharacterRam[_dataRamBank][_ramChip][_ramChipLine][1];
}

// read data ram status character
function rd2() {
    _acc = _statusCharacterRam[_dataRamBank][_ramChip][_ramChipLine][2];
}

// read data ram status character
function rd3() {
    _acc = _statusCharacterRam[_dataRamBank][_ramChip][_ramChipLine][3];
}

// read rom port
// TODO: realize
function rdr() {

}

// write data ram character
function wrm() {
    _ram[_dataRamBank][_ramChip][_ramChipLine][_dp] = _acc;
}

// write data ram status character
function wr0() {
    _statusCharacterRam[_dataRamBank][_ramChip][_ramChipLine][0] = _acc;
}

// write data ram status character
function wr1() {
    _statusCharacterRam[_dataRamBank][_ramChip][_ramChipLine][1] = _acc;
}

// write data ram status character
function wr2() {
    _statusCharacterRam[_dataRamBank][_ramChip][_ramChipLine][2] = _acc;
}

// write data ram status character
function wr3() {
    _statusCharacterRam[_dataRamBank][_ramChip][_ramChipLine][3] = _acc;
}

// write ram port
// TODO: realize
function wmp() {
    
}

// write rom port
// TODO: realize
function wrr() {

}

// add data ram to accumulator with carry
function adm() {
    _acc = _acc + _cc + _ram[_dataRamBank][_ramChip][_ramChipLine][_dp];
    _cc = _acc >> 4;
    _acc = _acc & 0xf;
}

// substract data ram from memory with borrow
function sbm() {
    _acc = _acc + (_cc == 0? 1: 0) + ~(_ram[_dataRamBank][_ramChip][_ramChipLine][_dp]);
    _cc = _acc > 0? 1: 0;
    _acc = _acc & 0xf;
}

// write program ram
// TODO: realize
function wpm() {

}