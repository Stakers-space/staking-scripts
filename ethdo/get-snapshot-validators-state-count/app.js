/**
 * Load all files
 * Get indexes from offline-preparation for pubids in deposit files
 */
const fs = require('fs');
const path = require('path');

const offlinePreparationFilePath = path.join(__dirname, '..', 'get-snapshot-validators-state-count/offline-preparation.json');

console.log("offlinePreparationFilePath:",offlinePreparationFilePath);

fs.readFile(offlinePreparationFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error(err);
    }

    let states = {};
    var opd = JSON.parse(data),
        offlinePreparationData_src_l = opd.validators.length;
    console.log(`Data for epoch ${opd.epoch}`);
    for(var i=0;i<offlinePreparationData_src_l;i++){
        let validatorState = opd.validators[i].state;
        if(!states[validatorState]) states[validatorState] = 0;
        states[validatorState]++;
    }
    console.log(states);
});