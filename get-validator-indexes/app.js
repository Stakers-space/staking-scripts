/**
 * Load all files
 * Get indexes from offline-preparation for pubids in deposit files
 */
const fs = require('fs');
const path = require('path');
const GetFilesContent = require('../utils/get_files_content/get-files-data-in-directory');

const directoryPath = path.join(__dirname, '..', 'get-validator-indexes/data/deposit_data');
const offlinePreparationFilePath = path.join(__dirname, '..', 'get-validator-indexes/data/offline-preparation.json');

console.log("directoryPath:", directoryPath, "| offlinePreparationFilePath:",offlinePreparationFilePath);

var offlinePreparationData = {};
var depositDataFiles = {};
var callbacks = 2;

fs.readFile(offlinePreparationFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error(err);
    }

    var opd = JSON.parse(data).validators,
        offlinePreparationData_src_l = opd.length;
    for(var i=0;i<offlinePreparationData_src_l;i++){
        //console.log(opd[i].pubkey, opd[i].index);
        offlinePreparationData[opd[i].pubkey] = opd[i].index;
    }
    GetIndexes();
});

GetFilesContent(directoryPath, 'deposit_data-', '.json', (err, content) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Files Content | keys:', Object.keys(content));
        depositDataFiles = content;
        GetIndexes();
    }
});

function GetIndexes(){
    callbacks--;
    if(callbacks > 0) return;

    console.log("All files ready for processing");
    console.log("Total validators:", Object.keys(offlinePreparationData).length);
    var a = 0;
    //console.log(offlinePreparationData);
    //console.log(offlinePreparationData["0xb28e8d53d85e43558fde1eb1c6abcdc0860193490237d72c39da2aec6f6a004e24ad4874fc086f92b68ed712eb52bec6"]);
    //return;
    for (const ddfile in depositDataFiles) {
        if (depositDataFiles.hasOwnProperty(ddfile)) {
            const value = depositDataFiles[ddfile];
            if (Array.isArray(value)) {
                //console.log(`DDFile: ${ddfile}, validators: ${value.length}`);
                var validatorsL = value.length;
                var link = "https://gnosischa.in/dashboard?validators="
                var ids = [];
                for (var y=0;y<validatorsL;y++){
                    const pubkey = String("0x"+value[y].pubkey);
                    //console.log(a, value[y].pubkey, offlinePreparationData[pubkey]);
                    ids.push(offlinePreparationData[pubkey]);
                    if(ids.length > 99){
                        console.log(ddfile,"|", link+ids.toString());
                        ids = [];
                    }
                    a++;
                }
                console.log(ddfile,"|", link+ids.toString());
          } else {
                console.log(`DDFile: ${ddfile}, is not an array`);
          }
        }
    }
}