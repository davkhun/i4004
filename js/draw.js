// execute program
function runBtn() {
    _init();
    let source = $('#sourceCodeT').val();
    parseCode(source);
    execute();
    drawParams();
}

// execute program step
function stepBtn() {
    if (_stack.length == 0) {
        let source = $('#sourceCodeT').val();
        parseCode(source);
    }
    if (_ip >= _stack.length) {
        $('#copyToClipboardBtn').hide();
        showModal('Step execution', 'End of program was reached');
        return;
    }
    step(_stack[_ip]);
    drawParams();
    console.log('Executed: ', _stack[_ip], _ip);
    _ip++;
    _counter++;
}

// drawing params area
function drawParams() {
    drawRam();
    drawRegisters();
    $('#carryP').text(_cc);
    $('#accP').text(_acc);
    $('#counterP').text(_counter);
    $('#dataPointerP').text(_dp);
    $('#dataRamBankP').text(_dataRamBank);
    $('#ramChipP').text(_ramChip);
    $('#ramChipLineP').text(_ramChipLine);
}

// drawing registers area
function drawRegisters() {
    for (let i = 0; i < _rx.length; i++) {
        $('#tR'+ i).text(_rx[i]);
        if (_rx[i] == 0) {
            $('#tR'+ i).removeAttr('style');
        }
        else {
            $('#tR'+ i).attr('style', 'background:green');
        }
    }
}

// drawing ram area
function drawRam() {
    $('#ramT tbody').empty();
    let bankSelect = parseInt($('#ramBankSelect').val());
    let cols = '';
    let statusCharacterCounter = 0;
    for (let ramChip = 0; ramChip < 4; ramChip++) {
        let chipN = `Chip #${ramChip}`;
        for (let chipRegisterLine = 0; chipRegisterLine < 4; chipRegisterLine ++) {
            // draw register cell
            for (let register = 0; register < 16; register ++) {
                let cellStyle = _ram[bankSelect][ramChip][chipRegisterLine][register] == 0? '': 'style="background:green"';
                let col = `<td ${cellStyle}>${_ram[bankSelect][ramChip][chipRegisterLine][register]}</td>`;
                cols += col;
            }
            // draw data status character cell 
            for (let register = 0; register < 4; register ++) {
                let cellStyle = _statusCharacterRam[bankSelect][ramChip][chipRegisterLine][register] == 0? 'style="background:dimgray"': 'style="background:darkgreen"';
                let col = `<td ${cellStyle}>${_statusCharacterRam[bankSelect][ramChip][chipRegisterLine][register]}</td>`;
                cols += col;
            }
            // draw whole row
            let row = `<tr><td>${chipN}</td>${cols}</tr>`;
            cols = '';
            $('#ramT tbody').append(row);
        }
    }
}

function getBase64Link() {
    let source = $('#sourceCodeT').val();
    if (source.length == 0) {
        return null;
    }
    let b64 = window.btoa(source);
    return window.location.origin + window.location.pathname + 'index.html?code=' + b64;
}

function setBase64Code() {
    let query = window.location.search;
    if (query.length == 0) {
        return;
    }
    let param = new URLSearchParams(query);
    let b64 = param.get('code');
    if (b64 != null) {
        $('#sourceCodeT').val(atob(b64));
    }
}

function showModal(title, content) {
    $('#modalContentP').text(content);
    $('#modalTitle').text(title);
    $('#notifyModal').modal('show');
}