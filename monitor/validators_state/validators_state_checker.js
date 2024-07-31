// Version 1.0.4
const pubKeysList = require("./public_keys_testlist.json");
const beaconClientUrl = "http://localhost:9596/eth/v1/beacon";

// script variables and resources
const pubKeys_instances = Object.keys(pubKeysList);
var instanceIndex = 0;
var pubKeyIndex = 0;
console.log("pubKeys_instances:", pubKeys_instances);

const http = require('http');
const startTime = new Date().getTime();


// Get slot from Headers data
GetBeaconApiData("/headers", function(err,resp){
    if(err) {
        console.error(err);
        return;
    }
    
    const slot = resp["data"][0].header.message.slot;
    //console.log("headers data:", resp["data"], "slot:", slot);

    // Get Attestations data for last slot
    GetBeaconApiData("/blocks/"+slot+"/attestations", function(err,resp){
        if(err) {
            console.error(err);
            return;
        }

        const attestationsData = resp["data"];
        console.log(resp);
        console.log(`attestations data for slot ${slot} | commiteeIndexes: ${attestationsData.length}`);
        for (var i=0;i<attestationsData.length;i++){
            console.log(attestationsData[i]);
        }

        GetPubKeyStateData(instanceIndex, pubKeyIndex, function(err,resp){
            //console.log(err,resp);
            // process aggregated state update
            console.log("Monitor state completed in", new Date().getTime() - startTime);
        });
    });
});


function GetPubKeyStateData(instanceIndex, pubkeyIndex, cb){ // synchronously in a single thread - what's the time of the whole iteration? Split it into more threads?
    const instanceData = pubKeysList[pubKeys_instances[instanceIndex]];
    const instancePubKey = pubKeysList[pubKeys_instances[instanceIndex]].pubKeys[pubkeyIndex];
    
    // Get data from beacon api
    GetBeaconApiData("/states/head/validators?id="+instancePubKey, function(err,resp){
        if(err) {
            return cb(err, {"instanceIndex":instanceIndex,"pubKeyIndex":pubKeyIndex, "pubKey": instanceData.pubKeys[pubKeyIndex]});
        }
        console.log(`GetPubKeyStateData iteration | pubkey ${pubkeyIndex}/${instanceData.count} in instance ${instanceIndex}/${pubKeys_instances.length} | ${instancePubKey}`);
        // Compare to public_keys_list
            // prepare aggregated state (if everything ok, then "OK" only)
            console.log("validator resp:", resp);

        // continue on the next pubkey
        pubkeyIndex++;
        console.log(`pubKey increased to ${pubkeyIndex} | pubkeyIndex === instanceData.count || ${pubkeyIndex} === ${instanceData.count} =>`, (pubkeyIndex === instanceData.count));
        if(pubkeyIndex === instanceData.count) {
            instanceIndex++
            pubkeyIndex = 0;
            console.log(`instanceIndex increased to ${instanceIndex} | pubKey reseted to ${pubkeyIndex}`);
        }
        console.log(`compare | instanceIndex === pubKeys_instances.length || ${instanceIndex} === ${pubKeys_instances.length} =>`, (instanceIndex === pubKeys_instances.length));
        if(instanceIndex === pubKeys_instances.length) {
            return cb();
        } else {
            GetPubKeyStateData(instanceIndex, pubkeyIndex, cb);
        }
    });
}


function GetBeaconApiData(path, cb){
    http.get(beaconClientUrl+path, (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
            data += chunk;
        });
      
        resp.on('end', () => {
            return cb(null, JSON.parse(data));
        });
      
    }).on("error", (err) => {
        return cb(err, null);
    });
}

function cleanUpAndExit() {
    console.log("exiting");
    // exit services
    process.exit(0);
}
process.on('SIGTERM', cleanUpAndExit);
process.on('SIGINT', cleanUpAndExit);


// -------------------------------------------- Test 2
const lodestarApiUrl = 'http://localhost:9596/eth/v1';
function httpGet(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function getValidatorInfo(pubKey) {
    try {
        const url = `${lodestarApiUrl}/beacon/states/head/validators?id=${pubKey}`;
        const response = await httpGet(url);
        return response.data[0];
    } catch (error) {
        console.error('Error fetching validator info:', error);
        throw error;
    }
}

async function getBlockAttestations(slot) {
    try {
        const url = `${lodestarApiUrl}/beacon/blocks/${slot}/attestations`;
        const response = await httpGet(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching block attestations:', error);
        throw error;
    }
}

async function getLastAttestation(pubKey) {
    try {
        const validatorInfo = await getValidatorInfo(pubKey);
        const lastAttestationSlot = validatorInfo.index;

        const attestations = await getBlockAttestations(lastAttestationSlot);
        const validatorAttestation = attestations.find(attestation =>
            attestation.data.attesting_indices.includes(validatorInfo.validator.index)
        );

        return {
            pubKey,
            lastAttestation: validatorAttestation ? validatorAttestation.data : null
        };
    } catch (error) {
        console.error('Error fetching last attestation:', error);
        throw error;
    }
}

(async () => {
    const pubKeys = [
        '0xa1d1ad0714035353258038e964ae9675dc0252ee22cea896825c01458e1807bfad2f9969338798548d9858a571f7425c'
        // Next pubkey
    ];

    const validatorAttestations = await Promise.all(pubKeys.map(getLastAttestation));
    console.log(validatorAttestations);
})();