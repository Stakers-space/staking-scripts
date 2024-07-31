const fs = require('fs');
const path = require('path');
const GetFilesContent = require('../../../utils/get_files_content/get-files-data-in-directory');

const publicKeysList_outputFile = path.join(__dirname, '..', 'public_keys_list.json');
const depositsDataFileDirectory = path.join(__dirname, '..', '..', '..', 'get-validator-indexes/data/deposit_data');
const offlinePreparationFilePath = path.join(__dirname, '..', '..', '..', 'get-validator-indexes/data/offline-preparation.json');
console.log("depositsData", depositsDataFileDirectory, "\nofflinePreparationFilePath:", offlinePreparationFilePath, "\npublicKeys:", publicKeysList_outputFile);

class ValidatorDataModel {
    constructor(count, validatorIndexes){
        this.c = count;
        this.v = validatorIndexes;
    }

    findDuplicateIndexes(data) {
        const keyCount = {};
    
        Object.values(data).forEach(item => {
            item.v.forEach(key => {
                keyCount[key] = (keyCount[key] || 0) + 1;
            });
        });
    
        const duplicates = Object.keys(keyCount).filter(key => keyCount[key] > 1);
        return duplicates;
    }
}

var callbacks = 2;
var offlinePreparationData = {};
var validatorsData = null;
var skippedPubKeys = {};

function ProcessData(err){
    if(err){
        console.error(err);
        return;
    }
    callbacks--;
    if(callbacks > 0) return;

    const publicKeys = GetPublicKeys(validatorsData, offlinePreparationData);
    // duplicity check
    const duplicatedKeys = new ValidatorDataModel().findDuplicateIndexes(publicKeys);
    if(duplicatedKeys.length > 0) {
        console.error("X Found "+duplicatedKeys.length+" duplicities in deposit files. Duplicated pubkeys:", duplicatedKeys);
        return;
    }
    console.log(`✓ Duplicity check: ${duplicatedKeys.length} found duplicities`)

    UpdatePublicKeysListFile(publicKeys, function(err){
        if(err){
            console.error(err);
        } else {
            console.log(`${publicKeysList_outputFile} file has been updated`);
        }
    });
}

// load offline data file (contain indices)
fs.readFile(offlinePreparationFilePath, 'utf8', (err, data) => {
    if (!err) {
        var opd = JSON.parse(data).validators,
        offlinePreparationData_src_l = opd.length;
        //console.log(offlinePreparationData_src_l, opd);
        for(var i=0;i<offlinePreparationData_src_l;i++){
            //console.log(opd[i].pubkey, opd[i].index);
            offlinePreparationData[opd[i].pubkey] = opd[i].index; // attach index for each pubkey
        }
    }
    ProcessData(err);
});

GetFilesContent(depositsDataFileDirectory, 'deposit_data-', '.json', (err, content) => {
    if (err) {
        console.error('Error:', err);
    } else {
       // console.log('Files Content | keys:', Object.keys(content));
        validatorsData = content;
        ProcessData(err);
    }
});

function GetPublicKeys(depositDataFiles, offlinePreparationData){
    //console.log(offlinePreparationData);
    let pubKeys = {};
    for (const ddfile in depositDataFiles) {
        if (depositDataFiles.hasOwnProperty(ddfile)) {
            const value = depositDataFiles[ddfile];
            //console.log(value);
            if (Array.isArray(value)) {
                var validatorsL = value.length;
                // get instanceNumber
                if(validatorsL === 0) continue;
                let instanceKeys = [];
                for (var y=0;y<validatorsL;y++){
                    //instanceKeys.push(String("0x"+value[y].pubkey));
                    const pubKeyIndex = offlinePreparationData[String("0x"+value[y].pubkey)];
                    if(pubKeyIndex){
                        //console.log(String("0x"+value[y].pubkey),"=>",pubKeyIndex);
                        instanceKeys.push(Number(pubKeyIndex));
                    } else {
                        //console.log(`Warn | ${value[y].pubkey} from ${ddfile} has not been activated yet. Skipping...`);
                        if(!skippedPubKeys[ddfile]) skippedPubKeys[ddfile] = 0;
                        skippedPubKeys[ddfile]++;
                    }
                }
                var instanceIdentifier = ddfile;
                // remove ending
                if(instanceIdentifier.indexOf(".") > -1) instanceIdentifier = instanceIdentifier.replace(/\.json$/, "");
                // Use only part after last `_`
                if(instanceIdentifier.indexOf("_") > -1){
                    instanceIdentifier = instanceIdentifier.split("_");
                    instanceIdentifier = instanceIdentifier[instanceIdentifier.length-1];
                }
                pubKeys[instanceIdentifier] = new ValidatorDataModel(instanceKeys.length, instanceKeys);
            } else {
                console.log(`DDFile: ${ddfile}, is not an array`);
            }
        }
    }
    return pubKeys;
}

function UpdatePublicKeysListFile(data, cb){
    //const fileContent = data.join('\n');
    const fileContent = JSON.stringify(data, null, 2);
    fs.writeFile(publicKeysList_outputFile, fileContent, (err) => {
        return cb(err);
    });
}