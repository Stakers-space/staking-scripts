const fs = require('fs');
const path = require('path');
const GetFilesContent = require('../../../utils/get_files_content/get-files-data-in-directory');

const publicKeysList_outputFile = path.join(__dirname, '..', 'public_keys_list.txt');
const depositsDataFileDirectory = path.join(__dirname, '..', '..', '..', 'get-validator-indexes/data/deposit_data');
console.log("depositsData", depositsDataFileDirectory, "publicKeys:", publicKeysList_outputFile);

GetFilesContent(depositsDataFileDirectory, 'deposit_data-', '.json', (err, content) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Files Content | keys:', Object.keys(content));
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
    let pubKeys = [];
    for (const ddfile in depositDataFiles) {
        if (depositDataFiles.hasOwnProperty(ddfile)) {
            const value = depositDataFiles[ddfile];
            //console.log(value);
            if (Array.isArray(value)) {
                var validatorsL = value.length;
                for (var y=0;y<validatorsL;y++){
                    pubKeys.push(String("0x"+value[y].pubkey));
                }
            } else {
                console.log(`DDFile: ${ddfile}, is not an array`);
            }
        }
    }
    return pubKeys;
}

function UpdatePublicKeysListFile(data, cb){
    const fileContent = data.join('\n');
    fs.writeFile(publicKeysList_outputFile, fileContent, (err) => {
        return cb(err);
    });
}