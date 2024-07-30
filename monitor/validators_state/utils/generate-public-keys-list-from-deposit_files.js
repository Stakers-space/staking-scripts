const fs = require('fs');
const path = require('path');
const GetFilesContent = require('../../../utils/get_files_content/get-files-data-in-directory');

const publicKeysList_outputFile = path.join(__dirname, '..', 'public_keys_list.json');
const depositsDataFileDirectory = path.join(__dirname, '..', '..', '..', 'get-validator-indexes/data/deposit_data');
console.log("depositsData", depositsDataFileDirectory, "publicKeys:", publicKeysList_outputFile);

GetFilesContent(depositsDataFileDirectory, 'deposit_data-', '.json', (err, content) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Files Content | keys:', Object.keys(content));
        const publicKeys = GetPublicKeys(content);

        // duplicity check
        const duplicatedKeys = findDuplicateKeys(publicKeys);
        if(duplicatedKeys.length > 0) {
            console.error("Found "+duplicatedKeys.length+" duplicities in deposit files. Duplicated pubkeys:", duplicatedKeys);
            return;
        }

        UpdatePublicKeysListFile(GetPublicKeys(content), function(err){
            if(err){
                console.error(err);
            } else {
                console.log(`${publicKeysList_outputFile} file has been updated`);
            }
        });
    }
});

function GetPublicKeys(depositDataFiles){
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
                    instanceKeys.push(String("0x"+value[y].pubkey));
                }
                pubKeys[ddfile] = {
                    count: instanceKeys.length,
                    pubKeys: instanceKeys
                };
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

function findDuplicateKeys(data) {
    const keyCount = {};

    Object.values(data).forEach(item => {
        item.pubKeys.forEach(key => {
            keyCount[key] = (keyCount[key] || 0) + 1;
        });
    });

    const duplicates = Object.keys(keyCount).filter(key => keyCount[key] > 1);
    return duplicates;
}