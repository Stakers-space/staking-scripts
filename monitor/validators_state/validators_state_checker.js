
const pubKeys = require("./public_keys_list.json");
const pubKeys_instances = Object.keys(pubKeys);
var instanceIndex = 0;
var pubKeyIndex = 0;

const http = require('http');

const startTime = new Date().getTime();

// Get slot from Headers data

// Get Attestations data for last slot

function GetPubKeyStateData(instanceIndex, pubkeyIndex, cb){ // synchronously in a single thread - what's the time of the whole iteration? Split it into more threads?
    const instanceData = pubKeys[pubKeys_instances[instanceIndex]];

    // Get data from beacon api
    GetBeaconApiData("http://localhost:5052/eth/v1/beacon/states/head/validators?id="+instanceData.pubKeys[pubKeyIndex], function(err,resp){
        if(err) {
            return cb(err, {"instanceIndex":instanceIndex,"pubKeyIndex":pubKeyIndex, "pubKey": instanceData.pubKeys[pubKeyIndex]});
        }
        console.log("data", resp);
            // process info write

        // continue on the next pubkey
        pubkeyIndex++;
        if(pubkeyIndex === instanceData.count) instanceIndex++
        if(instanceIndex === pubKeys_instances.length) {
            return cb();
        } else {
            GetPubKeyStateData(instanceIndex, pubkeyIndex, cb);
        }
    });
}


function GetBeaconApiData(url, cb){
    http.get(url, (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
            data += chunk;
        });
      
        resp.on('end', () => {
            return cb(null, JSON.parse(data));
        });
      
    }).on("error", (err) => {
        console.log("Error: " + err.message);
        return cb(err, null);
    });
}

GetPubKeyStateData(instanceIndex, pubKeyIndex, function(err,resp){
    console.log(err,resp);

    console.log("processingTime:", new Date().getTime() - startTime);
});
// load keys from public_keys_list

// Get data from Beaconchain api
    // Compare to public_keys_list
        // send aggregated state (if everything ok, then "OK" only)