
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
    
    const slot = resp[data].header.message.slot;
    console.log("headers data:", resp, "slot:", slot);

    // Get Attestations data for last slot
    GetBeaconApiData("/blocks/"+slot+"/attestations", function(err,resp){
        if(err) {
            console.error(err);
            return;
        }

        console.log("attestations data:", resp);

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
    GetBeaconApiData("/states/head/validators?id="+instanceData.pubKeys[pubKeyIndex], function(err,resp){
        if(err) {
            return cb(err, {"instanceIndex":instanceIndex,"pubKeyIndex":pubKeyIndex, "pubKey": instanceData.pubKeys[pubKeyIndex]});
        }
        console.log(pubkeyIndex,"/",instanceIndex, "| val data", resp);
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