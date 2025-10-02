const fs = require('fs');
const path = require('path');

const {GetSubdirectories, GetFilesContent} = require('../../../libs/filesystem-api/filesystem-api');

const publicKeysList_outputFile = path.join(__dirname, '..', 'public_keys_list.json');
const depositsDataFileDirectory = path.join(__dirname, '..', '..', '..', 'get-validator-indexes/data/deposit_data');
const offlinePreparationFilePath = path.join(__dirname, '..', '..', '..', 'get-validator-indexes/data/offline-preparation.json');
console.log("depositsData", depositsDataFileDirectory, "\nofflinePreparationFilePath:", offlinePreparationFilePath, "\npublicKeys:", publicKeysList_outputFile);


class PublickKeysListOutput {
    constructor(){}

    AddInstance(InstanceId, valIndexesArray){
        this[InstanceId] = {
            c: valIndexesArray.length,
            v: valIndexesArray
        }
    }

    GetPublicKeysFromOfflineFile(depositDataFiles, offlinePreparationData){
        //console.log(offlinePreparationData);
        for (const subDirectory of depositDataFiles) {
            for (const [ddfile, instances] of Object.entries(subDirectory.instances)) {
                if (!Array.isArray(instances)) {
                    console.log(`DDFile: ${ddfile}, is not an array`);
                    continue;
                }
                var validatorsL = instances.length;
                // get instanceNumber
                if(validatorsL === 0) continue;
                let instanceKeys = [];
                for (var y=0;y<validatorsL;y++){
                    //instanceKeys.push(String("0x"+instances[y].pubkey));
                    const pubKeyIndex = offlinePreparationData[String("0x"+instances[y].pubkey)];
                    if(pubKeyIndex){
                        //console.log(String("0x"+instances[y].pubkey),"=>",pubKeyIndex);
                        instanceKeys.push(Number(pubKeyIndex));
                    } else {
                        //console.log(`Warn | ${instances[y].pubkey} from ${ddfile} has not been activated yet. Skipping...`);
                        if(!generateProcess.skippedPubKeys[ddfile]) generateProcess.skippedPubKeys[ddfile] = 0;
                        generateProcess.skippedPubKeys[ddfile]++;
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
                this.AddInstance(instanceIdentifier, instanceKeys);
           }
        }
        return this;
    }
}

class GeneratePublicKeysListJsonUtil {
    constructor(){
        this.offlinePreparationData = {};
        this.validatorsData = [];
        this.skippedPubKeys = {};
    }

    AddValidatorsData(directory, instances){
        this.validatorsData.push({
            "directory": directory,
            "instances": instances
        });
    }

    Process(){
        this.GetData(function(err) {
            if(err){
                console.error(err);
                return;
            }

            // Generate file data
            const publicKeys = new PublickKeysListOutput().GetPublicKeysFromOfflineFile(generateProcess.validatorsData, generateProcess.offlinePreparationData);
            
            // duplicity check
            const duplicatedKeys = generateProcess.findDuplicateIndexes(publicKeys);
            if(duplicatedKeys.length > 0) {
                console.error("X Found "+duplicatedKeys.length+" duplicities in deposit files. Duplicated pubkeys:", duplicatedKeys);
                return;
            }
            console.log(`✓ Duplicity check: ${duplicatedKeys.length} found duplicities`)
        
            // Save file
            fs.writeFile(publicKeysList_outputFile, JSON.stringify(publicKeys, null, 2), (err) => {
                if(err){
                    console.error(err);
                } else {
                    console.log(`${publicKeysList_outputFile} file has been updated`);
                }
            });
        });
    }

    GetData(cb){
        let scheduledtasks = 2;
        
        // load offline data file (contain indices)
        fs.readFile(offlinePreparationFilePath, 'utf8', (err, data) => {
            if (!err) {
                const opd = JSON.parse(data).validators;
                // attach index for each pubkey
                for(const obj of opd){ generateProcess.offlinePreparationData[obj.pubkey] = obj.index; }
            }
            TaskCompleted(err);
        });

        // load deposit keys
        GetSubdirectories(depositsDataFileDirectory).then(subdirs => {
            const subdirectories = subdirs.length;
            let completedDirectores = 0;
        
            for(var i=0;i<subdirectories;i++){
                if(subdirs[i] !== "nofollow"){
                    const folderName = subdirs[i];
                    const subDirectory = depositsDataFileDirectory+"/"+folderName;
                    GetFilesContent(subDirectory, 'deposit_data-', '.json', (err, content) => {
                        generateProcess.AddValidatorsData(folderName, content);
                        GetIndexesTask(err);
                    });
                } else {
                    GetIndexesTask();
                }
            }
        
            function GetIndexesTask(err){
                completedDirectores++;
                if(completedDirectores === subdirectories || err) TaskCompleted(err);
            }
        });

        function TaskCompleted(err){
            if(err) return cb(err);
            scheduledtasks--;
            if(scheduledtasks === 0) return cb(null);
        }
    }

    findDuplicateIndexes(instances) {
        const keyCount = {};
        Object.values(instances).forEach(instance => {
            instance.v.forEach(key => {
                 keyCount[key] = (keyCount[key] || 0) + 1;
            });
        });
        return Object.keys(keyCount).filter(key => keyCount[key] > 1);;
    }
}

const generateProcess = new GeneratePublicKeysListJsonUtil();
generateProcess.Process();