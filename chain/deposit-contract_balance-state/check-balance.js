// Load snapshot
/**
 * Get indexes from offline-preparation for pubids in deposit files
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

class CheckBalance {
    constructor(){
        this.EtherscanAuthorization = "";
        this.offlinePreparationFilePath = path.join(__dirname, '..', 'deposit-contract_balance-state/offline-preparation.json');
        this._validatorsList = [];
        this._validatorsCount = 0;
        this._validatorPrIndex = 0;
        this._slotsPerEpoch = 16; // gnosis chain
        this._state_root = "head";
        this._totalValidatorBalance = 0;
    }

    Process(){
        console.log("Starting the calculation...");
        this.LoadValidatorPubKeys(function(epoch){
            // calculate slot number from the snapshot epoch
            /*const lastSlotNumberInEpoch = ((epoch * app._slotsPerEpoch + app._slotsPerEpoch - 1));
            console.log("├── slot number:", lastSlotNumberInEpoch);
            // get root address of the last slot in the epoch
            app.HttpRequest({
                hostname: 'localhost',
                port: 9596,
                path: `/eth/v2/beacon/blocks/${lastSlotNumberInEpoch}`,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            }, null, (err,resp) => {
                if(err) return console.error("└── Err: BeaconChain API is not accessible");  
                const slotData = JSON.parse(resp);
                if(slotData.code === 404) return console.log(slotData.message);

                //app._state_root = slotData.data.message.state_root;
                //console.log(`├── state root for slot ${lastSlotNumberInEpoch}: ${app._state_root}`);
                // check balance of all validator pubkeys from the snapshot
                app.GetValidatorGnoBalance(0, function(err){
                    if(err) return console.error(err);
                    console.log(`├── Balance Snapshot for slot ${lastSlotNumberInEpoch} completed | Total GNO balance in ETHgwei: ${app._totalValidatorBalance}`);
                    // convert balances to GNO
                    app._totalValidatorBalance = app._totalValidatorBalance / 32;
                    console.log(`|  ├── In GNOgwei: ${app._totalValidatorBalance}`);
                    // convert gwei to whole units
                    app._totalValidatorBalance = app._totalValidatorBalance / 1e9;
                    console.log(`|  └── In GNO: ${app._totalValidatorBalance}`);

                    // Get GNO balance in deposit contract
                    app.GetDepositContractGnoBalance(function(err,dcData){
                        if(err) return console.error(err);
                        
                        // subtract GNO in deposit contract address
                        const GNOinDepositContract = JSON.parse(dcData).result; // this should be for time same as epoch snapshot
                        console.log(`├── GNO balance in deposit contract: ${GNOinDepositContract}`);

                        const balance = GNOinDepositContract - app._totalValidatorBalance;
                        console.log("└── Deposit contract balance:", balance);
                    });
                });
            })*/
        });
    }

    GetValidatorGnoBalance = function(index, cb){
        if(index >= app._validatorsCount) return cb(null);

        var options = {
            hostname: 'localhost',
            port: 9596,
            path: `/eth/v1/beacon/states/${app._state_root}/validator_balances?id=${app._validatorsList[index]}`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        }
        app.HttpRequest(options, null, function(err,data){
            const validatorData = JSON.parse(data);
            if(validatorData.code === 404) return console.log(validatorData.message);
            app._totalValidatorBalance += Number(validatorData.data[0].balance);

            if(index % 10000 === 0) console.log(`├── progress: ${Math.round((index / app._validatorsCount) *100)}% | ${index} of ${app._validatorsCount} validators processed`)
            index++;
            app.GetValidatorGnoBalance(index,cb);
        });   
    };

    LoadValidatorPubKeys(cb){
        console.log("├── loading offlinePreparationFilePath:",app.offlinePreparationFilePath);
        var options = {
            hostname: 'localhost',
            port: 9596,
            path: `/eth/v1/beacon/states/head/validators`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        }
        app.HttpRequest(options, null, function(err,data){
            const validatorData = JSON.parse(data);
            console.log("validators:", validatorData.length);
        });
        
        /*fs.readFile(app.offlinePreparationFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error(err);
            }

            var opd = JSON.parse(data);
            app._validatorsCount = opd.validators.length;
            console.log(`├── Data for epoch ${opd.epoch} | registered pubkeys: ${app._validatorsCount}`);
            for(var i=0;i<app._validatorsCount;i++){
                app._validatorsList.push(opd.validators[i].pubkey);
            }
            console.log(`|  └── ${app._validatorsList.length} pubkeys loaded`);
            return cb(opd.epoch);
        });*/
    }

    GetDepositContractGnoBalance = function(cb){
        var options ={
            hostname: 'api.gnosisscan.io',
            path: '/api?module=account&action=tokenbalance&contractaddress=0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb&address=0x0B98057eA310F4d31F2a452B414647007d1645d9&tag=latest&apikey='+app.EtherscanAuthorization,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        }
        app.HttpsRequest(options, cb);   
    };

    HttpRequest(options, body, cb){
        const req = http.request(options, (res) => {
            let response = '';
            res.on('data', (chunk) => { response += chunk; });
            res.on('end', () => { return cb(null, response); });     
        }).on('error', (err) => {
            cb(err);
        });
        if(body) req.write(body);
        req.end();
    };

    HttpsRequest(options, cb){
        const req = https.request(options, (resp) => {
            if(resp.statusCode === 404) return cb("Err 404: not found");
            let responseData = '';
            resp.on('data', (chunk) => { responseData += chunk; });
            resp.on('end', () => { return cb(null,responseData); }); 
        }).on('error', error => { return cb(error,null); });
        if(body) req.write(body);
        req.end();
    };

    LoadConfigFromArguments(){
        const args = process.argv.slice(2); // Cut first 2 arguments (node & script)
        const etherscanTokenIndex = args.indexOf('--etherscanapi-token');
        if (etherscanTokenIndex !== -1 && etherscanTokenIndex + 1 < args.length) {
            this.EtherscanAuthorization = args[etherscanTokenIndex + 1];
            console.log(`| └── loaded EtherscanAPI authentization token: ${this.EtherscanAuthorization} from attached param`);
        }
    }
}

const app = new CheckBalance();
app.Process();