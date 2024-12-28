'use strict';
// const version = "0.0.3";
const http = require('http');

class CheckBalance {
    constructor(){
        this.beaconPort = 9596;
        this.executionPort = 8545;
        //this.EtherscanAuthorization = "";
        this.withdrawalAddressSnapshot = null;
    }

    Process(){
        console.log(new Date(), "Starting check GNO balance in Gnosis Validators Deposit contract");
        this.LoadConfigFromArguments();
        let asyncTasks = 2;

        let epoch = null,
            GNO_validatorsBalance = 0,
            GNOinDepositContract = 0,
            GNO_unclaimed = 0,
            balanceDistributionRounding = {};
        app.withdrawalAddressSnapshot = {};

        // Get current epoch
        app.GetCurrentEpoch(function(err,epochNumber){
            if(err) return console.error(err);
            epoch = epochNumber;
            console.log(`|   └── Current epoch: ${epoch}`);

            // Get validators snapshot | ToDo: Replace head for certain epoch?
            app.GetValidatorsSnapshot(function(err, validatorData){
                if(err) return console.error(err);
                const registeredValidators = validatorData.data.length;
                console.log(`|  ├── snapshot completed | registered validators: ${registeredValidators}`);

                for(var i=0;i<registeredValidators;i++){
                    const balance = Number(validatorData.data[i].balance);
                    
                    GNO_validatorsBalance += balance;
                    
                    const withdrawalAddress = app.NormalizeAddress(validatorData.data[i].validator.withdrawal_credentials);

                    // unique withdrawal addresses for checking uncliamed GNOs and validators count distribution per withdrawal address
                    if(!app.withdrawalAddressSnapshot[withdrawalAddress]) app.withdrawalAddressSnapshot[withdrawalAddress] = { validators: 0, unclaimed_gno: 0 };
                    app.withdrawalAddressSnapshot[withdrawalAddress].validators++;

                    // distribution of GNO balance in validators
                    const roundedBalance = parseFloat((balance / 32 / 1e9).toFixed(2));
                    const key = roundedBalance.toString();
                    if(!balanceDistributionRounding[key]) balanceDistributionRounding[key] = 0;
                    balanceDistributionRounding[key]++;
                }

                console.log(`|  └── Withdrawal addresses:`, Object.keys(app.withdrawalAddressSnapshot).length);

                // calculate GNO balance
                console.log(`|  └── Total GNO balance holded by validators on beaconchain in ETHgwei: ${GNO_validatorsBalance}`);
                // convert balances to GNO
                GNO_validatorsBalance = GNO_validatorsBalance / 32;
                console.log(`|      ├── In GNOgwei: ${GNO_validatorsBalance}`);
                // convert gwei to whole units
                console.log(`|      └── In GNO: ${GNO_validatorsBalance / 1e9}`);

                // ToDo: Get Unclaimed GNOs
                app.GetUnclaimedGNOs(Object.keys(app.withdrawalAddressSnapshot), 0, function(err){
                    if(err) return console.error(err);

                    for(const wallet in app.withdrawalAddressSnapshot){
                        GNO_unclaimed += app.withdrawalAddressSnapshot[wallet].unclaimed_gno;
                    }

                    console.log(`|  └── Total unclaimed GNO balance by validators in ETHgwei: ${GNO_unclaimed}`);

                    OnAsyncTaskCompleted(err);
                });
            });
        });

        // Get GNO balance in deposit contract
        app.GetGnoBalance("0B98057eA310F4d31F2a452B414647007d1645d9", function(err,dcData){
            if(!err) {
                // subtract GNO in deposit contract address
                GNOinDepositContract = JSON.parse(dcData).result / 1e9; // this should be for time same as epoch snapshot
                console.log(`├── GNO balance in deposit contract: ${GNOinDepositContract} (${GNOinDepositContract / 1e9} GNO)`);
            }
            OnAsyncTaskCompleted(err);
        });


        function OnAsyncTaskCompleted(err){
            asyncTasks--;
            if(err) return console.error(err);
            if(asyncTasks !== 0) return;

            // convert gwei to whole units
            const balance = GNOinDepositContract - GNO_validatorsBalance;
            console.log("└── Deposit contract balance:", balance);
            console.log(`     └── In GNO: ${balance / 1e9}`);
            console.log("GNO distribution || rounded GNO holdings:number of validators", balanceDistributionRounding);

            console.log(new Date(), "process completed");
        };
    };

    GetCurrentEpoch(cb){
        console.log("├── Getting current Epoch number...");
        app.HttpRequest({
            hostname: 'localhost',
            port: app.beaconPort,
            path: `/eth/v1/beacon/states/head/finality_checkpoints`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        }, null, function(err,resp){
            if(err) return cb(err, null);
            try { 
                let pResp = JSON.parse(resp);
                return cb(null, Number(pResp["data"]["current_justified"].epoch));
            } catch(e){ 
                return cb(e, null);
            }
        });
    };

    GetValidatorsSnapshot(cb){
        console.log("├── Processing validators snapshot for head slot state...");
        app.HttpRequest({
            hostname: 'localhost',
            port: app.beaconPort,
            path: `/eth/v1/beacon/states/head/validators`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        }, null, function(err,data){
            if(err) return cb(err, null);
            try {
                return cb(null, JSON.parse(data));
            } catch(e){
                return cb(e, null);
            }
        });
    };

    GetUnclaimedGNOs(wallets, walletIndex, cb){
        if(walletIndex >= wallets.length) return cb(null);
        const wallet = wallets[walletIndex];
        console.log(`|  ├── Getting unclaimed GNOs for wallet: 0x${wallet} | ${walletIndex} / ${wallets.length}`);
        app.GetGnoBalance(wallet, function(err, value){
            if(err) return cb(err);
            
            const unclaimed_gno = JSON.parse(dcData).result;
            console.log(`|  |  └── Unclaimed GNOs at 0x${wallet}: ${unclaimed_gno} (${unclaimed_gno / 1e9} GNO)`);

            app.withdrawalAddressSnapshot[wallet].unclaimed_gno = Number(unclaimed_gno);
            walletIndex++;
            app.GetUnclaimedGNOs(wallets, walletIndex, cb);
        });

        /*function GetUnclaimedGnoValue(wallet, cb){
            console.log(`|  |  ├── Getting unclaimed GNOs for wallet: ${wallet} | characters: ${wallet.length}`);
            const withdrawableAmont_wlt = `0x70a08231${wallet.padStart(64, '0')}`;
            const data = JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_call",
                params: [{
                    to: "0x0B98057eA310F4d31F2a452B414647007d1645d9",
                    data: withdrawableAmont_wlt
                }, "latest"]
            });

            app.HttpRequest({
                hostname: 'localhost',
                port: app.executionPort,
                path: '/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            }, data, function(err, response){
                if(err) return cb(err);
                console.log(`|  |  ├── Response: ${response}`);
                if(response.includes('error')) return cb(response);

                const hexValue = JSON.parse(response).result;
                const decimalValue = parseInt(hexValue, 16);
                console.log(`|  |  └── Unclaimed GNOs at 0x${wallet}: ${decimalValue}`);
                return cb(null, decimalValue);
            });
        };*/
    };

    GetGnoBalance = function(wallet, cb){
        // from local node
        const data = JSON.stringify({
            jsonrpc: "2.0",
            id: 0,
            method: "eth_call",
            params: [{
                to: "0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb",
                data: "0x70a082310000000000000000000000000B98057eA310F4d31F2a452B414647007d1645d9"
            }, "latest"]
        });

        app.HttpRequest({
            hostname: 'localhost',
            port: app.executionPort,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, data, function(err, response){
            if(err) return cb(err);

            const hexValue = JSON.parse(response).result;
            const decimalValue = BigInt(hexValue).toString(10);
            return cb(null, JSON.stringify({ result: Number(decimalValue) }));
        });
    };

    NormalizeAddress(address) {
        let normalized = address.replace(/^0x/, '');
        normalized = normalized.slice(-40);
        return normalized;
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

    LoadConfigFromArguments(){
        const args = process.argv.slice(2); // Cut first 2 arguments (node & script)
        /*const etherscanTokenIndex = args.indexOf('--etherscanapi-token');
        if (etherscanTokenIndex !== -1 && etherscanTokenIndex + 1 < args.length) {
            this.EtherscanAuthorization = args[etherscanTokenIndex + 1];
            console.log(`├── loaded EtherscanAPI authentization token: ${this.EtherscanAuthorization} from attached param`);
        }*/

        const beaconPortArgIndex = args.indexOf('--beaconPort');
        if (beaconPortArgIndex !== -1 && beaconPortArgIndex + 1 < args.length) {
            this.beaconPort = args[beaconPortArgIndex + 1];
            console.log(`├─ beaconPort: ${this.beaconPort} from attached param`);
        }
        const executionPortArgIndex = args.indexOf('--executionPort');
        if (executionPortArgIndex !== -1 && executionPortArgIndex + 1 < args.length) {
            this.executionPort = args[executionPortArgIndex + 1];
            console.log(`├─ executionPort: ${this.executionPort} from attached param`);
        }
    }
}

const app = new CheckBalance();
app.Process();