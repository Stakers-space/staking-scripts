/**
 * Load all files
 * Get indexes from offline-preparation for pubids in deposit files
 */
const fs = require('fs');
const path = require('path');
const GetSubdirectories = require('../../utils/get_files_content/get-subdirectories');
const GetFilesContent = require('../../utils/get_files_content/get-files-data-in-directory');

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

GetSubdirectories(directoryPath).then(subdirs => {
    const subdirectories = subdirs.length;
    let completedDirectores = 0;

    for(var i=0;i<subdirectories;i++){
        if(subdirs[i] !== "nofollow"){
            const accountId = subdirs[i];
            const accountDirectory = directoryPath+"/"+accountId;
            GetFilesContent(accountDirectory, 'deposit_data-', '.json', (err, content) => {
                if (err) {
                    console.error('Error:', err);
                } else {
                    console.log(accountId, "→ Subdirectory", accountDirectory);
                    //console.log('├── Files Content | keys:', Object.keys(content));
                    depositDataFiles[accountId] = content;
                    GetIndexesTask();
                }
            });
        } else {
            GetIndexesTask();
        }
    }

    function GetIndexesTask(){
        completedDirectores++;
        if(completedDirectores === subdirectories) GetIndexes();
    }
});

function GetIndexes(){
    callbacks--;
    if(callbacks > 0) return;

    console.log("All files ready for processing");
    console.log("Total validators:", Object.keys(offlinePreparationData).length);
    //console.log(offlinePreparationData);
    //console.log(offlinePreparationData["0xb28e8d53d85e43558fde1eb1c6abcdc0860193490237d72c39da2aec6f6a004e24ad4874fc086f92b68ed712eb52bec6"]);
    //return;
    //console.log("GetIndexes |", depositDataFiles);
    let a = 0;

    for (const ddirectory in depositDataFiles) {
        if (depositDataFiles.hasOwnProperty(ddirectory)) {
            const directoryFiles = depositDataFiles[ddirectory];
            for (const ddfile in directoryFiles) {
                if (directoryFiles.hasOwnProperty(ddfile)) {
                    const value = directoryFiles[ddfile];
                    if (Array.isArray(value)) {
                        var validatorsL = value.length;
                        console.log(`\n${ddfile} contains ${validatorsL} validators`);
                        var link = "https://gnosischa.in/dashboard?validators="
                        var ids = [];
                        for (var y=0;y<validatorsL;y++){
                            const pubkey = String("0x"+value[y].pubkey);
                            //console.log(a, value[y].pubkey, offlinePreparationData[pubkey]);
                            if(offlinePreparationData[pubkey]) ids.push(offlinePreparationData[pubkey]);
                            if(ids.length > 99){
                                console.log("├──",ddfile,"(",ids.length,")|", link+ids.toString());
                                ids = [];
                            } else if(y === validatorsL-1){
                                console.log("└──",ddfile,"(",ids.length,")|", link+ids.toString()); // display remaining
                            }
                            a++;
                        }
                  } else {
                        console.log(`DDFile: ${ddfile}, is not an array`);
                  }
                } else {
                    console.log("depositDataFiles[ddirectory] does not have ddfile property");
                }
            }
        }
    }

    
}