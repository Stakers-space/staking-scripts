const fs = require('fs');
const path = require('path');

const GetSubdirectories = require('../../../utils/get_files_content/get-subdirectories');
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
        data.forEach(account => {
            Object.values(account.instances).forEach(item => {
                item.v.forEach(key => {
                    keyCount[key] = (keyCount[key] || 0) + 1;
                });
            });
        });
        const duplicates = Object.keys(keyCount).filter(key => keyCount[key] > 1);
        return duplicates;
    }
}

class AccountDataModel {
    constructor(accountId){
        this.accountId = accountId;
        this.instances = {};
    }
    AddInstance(instanceId, ValidatorDataModel){
        this.instances[instanceId] = ValidatorDataModel;
    }
}

var callbacks = 2;
var offlinePreparationData = {};
var validatorsData = [];
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

GetSubdirectories(depositsDataFileDirectory).then(subdirs => {
    const subdirectories = subdirs.length;
    let completedDirectores = 0;

    for(var i=0;i<subdirectories;i++){
        if(subdirs[i] !== "nofollow"){
            const accountId = subdirs[i];
            const accountDirectory = depositsDataFileDirectory+"/"+accountId;
            GetFilesContent(accountDirectory, 'deposit_data-', '.json', (err, content) => {
                validatorsData.push({
                    "accountId": accountId,
                    "instances": content
                });
                GetIndexesTask(err);
            });
        } else {
            GetIndexesTask();
        }
    }

    function GetIndexesTask(err){
        completedDirectores++;
        if(completedDirectores === subdirectories || err) ProcessData(err);
    }
});

function GetPublicKeys(depositDataFiles, offlinePreparationData){
    //console.log(offlinePreparationData);
    let accounts = [];
    for (const accountIndex in depositDataFiles) {
        const accountData = depositDataFiles[accountIndex];
        let accountModel = new AccountDataModel(accountData.accountId);
        for (const ddfile in accountData.instances) {
            if (accountData.instances.hasOwnProperty(ddfile)) {
                const value = accountData.instances[ddfile];
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
                    accountModel.AddInstance(instanceIdentifier,new ValidatorDataModel(instanceKeys.length, instanceKeys));
                } else {
                    console.log(`DDFile: ${ddfile}, is not an array`);
                }
            }
        }
        accounts.push(accountModel);
    }
    return accounts;
}

function UpdatePublicKeysListFile(data, cb){
    //const fileContent = data.join('\n');
    const fileContent = JSON.stringify(data, null, 2);
    fs.writeFile(publicKeysList_outputFile, fileContent, (err) => {
        return cb(err);
    });
}