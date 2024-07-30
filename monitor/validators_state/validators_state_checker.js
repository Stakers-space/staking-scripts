// Version 1.0.0
const pubKeysList = require("./public_keys_testlist.json");
const beaconClientUrl = "http://localhost:9596/eth/v1/beacon";

// script variables and resources
const pubKeys_instances = Object.keys(pubKeysList);
var instanceIndex = 0;
var pubKeyIndex = 0;

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

    // Get data from beacon api
    console.log(`Loading data for pubkey ${instanceData.pubKeys[pubKeyIndex]}`);
    GetBeaconApiData("/states/head/validators?id="+instanceData.pubKeys[pubKeyIndex], function(err,resp){
        if(err) {
            return cb(err, {"instanceIndex":instanceIndex,"pubKeyIndex":pubKeyIndex, "pubKey": instanceData.pubKeys[pubKeyIndex]});
        }
        console.log(`pubkey ${pubkeyIndex}/${instanceData.count} in instance ${instanceIndex}/${instanceData.count} | pub_indices:`, resp);
        // Compare to public_keys_list
            // prepare aggregated state (if everything ok, then "OK" only)

        // continue on the next pubkey
        pubkeyIndex++;
        if(pubkeyIndex === instanceData.count) {
            instanceIndex++
            pubkeyIndex = 0;
        }
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