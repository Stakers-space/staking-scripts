// Version 1.0.6
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
/*GetBeaconApiData("/headers", function(err,resp){
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
});*/


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
            console.log("validator resp:", resp, resp.data[0].validator);

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

async function getValidatorLiveness(pubKeys) {
    try {
        const body = JSON.stringify({ indices: pubKeys });

        const options = {
            hostname: 'localhost',
            port: 9596,
            path: '/eth/v1/validator/liveness',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': body.length
            }
        };

        return new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    resolve(JSON.parse(data));
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            req.write(body);
            req.end();
        });
    } catch (error) {
        console.error('Error fetching validator liveness:', error);
        throw error;
    }
}

(async () => {
    const pubKeys = [
        '0xa1d1ad0714035353258038e964ae9675dc0252ee22cea896825c01458e1807bfad2f9969338798548d9858a571f7425c'
        // Přidejte další pub keys podle potřeby
    ];

    const validatorLiveness = await getValidatorLiveness(pubKeys);
    console.log(validatorLiveness);
})();

function cleanUpAndExit() {
    console.log("exiting");
    // exit services
    process.exit(0);
}
process.on('SIGTERM', cleanUpAndExit);
process.on('SIGINT', cleanUpAndExit);