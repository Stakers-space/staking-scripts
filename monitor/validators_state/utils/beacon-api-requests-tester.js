/**
 *  Version 1.0.1
 *  Test requests from beaconchain.
 *  Doc: https://ethereum.github.io/beacon-APIs/#/
 */ 

const beaconChainPort = 9596;
const validatorKeyIndex = 1;

// script variables and resources
const http = require('http');

class BeaconRequests {
    constructor(chainApi){
        this.utils = chainApi;
    }

    GetFinalityCheckpoint(){
        this.utils.HttpRequest(this.utils.Options({
            path: `/eth/v1/beacon/states/head/finality_checkpoints`,
        }), null, this.utils.OnResponse);
    }
}

class ValidatorRequests {
    constructor(chainApiInstance){
        this.utils = chainApiInstance;
    }

    GetLivenessState(epochNumber) {
        const body = JSON.stringify([validatorKeyIndex]);
        this.utils.HttpRequest(this.utils.Options({
            path: `/eth/v1/validator/liveness/${epochNumber}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': body.length
            }
        }), body, this.utils.OnResponse);
    };

}

class NodeRequests {
    constructor(chainApiInstance){
        this.utils = chainApiInstance;
    }

    GetIdentity(){
        this.utils.HttpRequest(this.utils.Options({
            path: `/eth/v1/node/identity`,
        }), null, this.utils.OnResponse);
    }

    GetPeers(){
        this.utils.HttpRequest(this.utils.Options({
            path: `/eth/v1/node/peers`,
        }), null, this.utils.OnResponse);
    }

    GetPeer(peerId){
        this.utils.HttpRequest(this.utils.Options({
            path: `/eth/v1/node/peers/${peerId}`,
        }), null, this.utils.OnResponse);
    }

    GetPeerCount(){
        this.utils.HttpRequest(this.utils.Options({
            path: `/eth/v1/node/peer_count`,
        }), null, this.utils.OnResponse);
    }

    GetVersion(){
        this.utils.HttpRequest(this.utils.Options({
            path: `/eth/v1/node/version`,
        }), null, this.utils.OnResponse);
    }

    GetSyncing(){
        this.utils.HttpRequest(this.utils.Options({
            path: `/eth/v1/node/syncing`,
        }), null, this.utils.OnResponse);
    }

    GetHealth(){
        this.utils.HttpRequest(this.utils.Options({
            path: `/eth/v1/node/health`,
        }), null, this.utils.OnResponse);
    }
}

class ChainApiRequest {
    constructor(){
        this.validator = new ValidatorRequests(this);
        this.beacon = new BeaconRequests(this);
        this.node = new NodeRequests(this);
    }

    OnResponse(err,data){
        if(err) {
            console.log(err);
            return;
        }
        console.log(data);
    }

    Options(options){
        options.hostname = 'localhost';
        options.port = beaconChainPort;
        if(!options.method) options.method = 'GET';
        if(!options.headers) options.headers = { 'Accept': 'application/json' }
        return options;
    }

    HttpRequest(options, body, cb){
        const req = http.request(options, (res) => {
            let response = '';
            res.on('data', (chunk) => { response += chunk; });
            res.on('end', () => { return cb(null, response); });     
        }).on('error', (err) => {
            cb(err, null);
        });
        if(body) req.write(body);
        req.end();
    }
}

function cleanUpAndExit() {
    process.exit(0);
}
process.on('SIGTERM', cleanUpAndExit);
process.on('SIGINT', cleanUpAndExit);


// Testing
const chainApi = new ChainApiRequest();
chainApi.beacon.GetFinalityCheckpoint();
chainApi.validator.GetLivenessState(1);


