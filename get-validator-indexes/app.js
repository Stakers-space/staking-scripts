/**
 * Load all files
 * Get indexes from offline-preparation for pubids in deposit files
 */

const fs = require('fs');
const path = require('path');
const directoryPath = "./data/deposit_data"

var offlinePreparationData = {};
var depositDataFiles = {};
var callbacks = 2;

fs.readFile('./data/offline-preparation.json', 'utf8', (err, data) => {
    if (err) {
        console.error(err);
        return res.status(500).send('Error reading JSON file');
    }

    var opd = JSON.parse(data).validators,
        offlinePreparationData_src_l = opd.length;
    for(var i=0;i<offlinePreparationData_src_l;i++){
        //console.log(opd[i].pubkey, opd[i].index);
        offlinePreparationData[opd[i].pubkey] = opd[i].index;
    }
    GetIndexes();
});

fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return console.log('Unable to scan directory: ' + err);
    }
  
    files.forEach((file) => {
        if (file.startsWith('deposit_data-') && file.endsWith('.json')) {
            const filePath = path.join(directoryPath, file);
    
            fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return console.log('Error reading file:', err);
            }
    
            try {
                const jsonData = JSON.parse(data);
                depositDataFiles[filePath] = jsonData;
            } catch (e) {
                console.log('Error parsing JSON:', e);
            }
            });
        }
    });

    GetIndexes();
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

