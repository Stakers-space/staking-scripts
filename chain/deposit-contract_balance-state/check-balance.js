'use strict';
const http = require('http');
const https = require('https');

class CheckBalance {
    constructor(){
        this.EtherscanAuthorization = "";
    }

    Process(){
        this.LoadConfigFromArguments();

        console.log(new Date(), "Starting check GNO balance in Gnosis Validators Deposit contract");
        console.log("├── Processing validators snapshot for head slot state...")
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
            const registeredValidators = validatorData.data.length;
            console.log(`|  ├── snapshot completed | registered validators: ${registeredValidators}`);

            let GNO_validatorsBalance = 0;
            for(var i=0;i<registeredValidators;i++){
                GNO_validatorsBalance += Number(validatorData.data[i].balance);
            }
            console.log(`|   └── Total GNO balance holded by validators in ETHgwei: ${GNO_validatorsBalance}`);
            // convert balances to GNO
            GNO_validatorsBalance = GNO_validatorsBalance / 32;
            console.log(`|      ├── In GNOgwei: ${GNO_validatorsBalance}`);
            // convert gwei to whole units
            GNO_validatorsBalance = GNO_validatorsBalance / 1e9;
            console.log(`|      └── In GNO: ${GNO_validatorsBalance}`);

            // Get GNO balance in deposit contract
            app.GetDepositContractGnoBalance(function(err,dcData){
                if(err) return console.error(err);
                
                // subtract GNO in deposit contract address
                let GNOinDepositContract = JSON.parse(dcData).result; // this should be for time same as epoch snapshot
                console.log(`├── GNO balance in deposit contract: ${GNOinDepositContract}`);
                // convert gwei to whole units
                GNOinDepositContract = GNOinDepositContract / 1e9;
                console.log(`|      └── In GNO: ${GNO_validatorsBalance}`);
                const balance = GNOinDepositContract - GNO_validatorsBalance;
                console.log("└── Deposit contract balance:", balance);
                console.log(new Date(), "process completed");
            });
        });
    };

    GetDepositContractGnoBalance = function(cb){
        var options ={
            hostname: 'api.gnosisscan.io',
            path: '/api?module=account&action=tokenbalance&contractaddress=0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb&address=0x0B98057eA310F4d31F2a452B414647007d1645d9&tag=latest&apikey='+app.EtherscanAuthorization,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        }
        app.HttpsRequest(options, null, cb);   
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

    HttpsRequest(options, body, cb){
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