'use strict';
const VERSION = "0.1.5";

const requireLib = function(relOrAbsPath, fallback_HomeDirPath) { const fs = require('fs'), os = require('os'), path = require('path');
    const p = path.isAbsolute(relOrAbsPath) ? relOrAbsPath : path.resolve(__dirname, relOrAbsPath);
    if (fs.existsSync(p)) return require(p);
    const fallback_AbsPath = path.join(os.homedir(), fallback_HomeDirPath);
    if(fs.existsSync(fallback_AbsPath)) return require(fallback_AbsPath);
    throw new Error(`Module not found at ${p} neither ${fallback_HomeDirPath}`);
}

// base unit: GWei
const { getFinalityCheckpoint, fetchValidatorsSnapshot } = requireLib('/srv/stakersspace_utils/libs/beacon-api.js','staking-scripts/libs/beacon-api/beacon-api.js');
const { getUnclaimedGNORewardsByWallet, getAssetbalance } = requireLib('/srv/stakersspace_utils/libs/execution-api.js', 'staking-scripts/libs/execution-api/execution-api.js');
const loadFromArgumentsUtil = requireLib('/srv/stakersspace_utils/libs/load-from-process-arguments.js', 'staking-scripts/libs/load-from-process-arguments/load-from-process-arguments.js');

class CalculateGnosisDepositContractBalance {
    constructor() {
        this.config = {
            beaconBaseUrl: `http://localhost:9596`,
            executionBaseUrl: `http://localhost:8545`
        }
        this.epoch = null;
        this.withdrawalAddressSnapshot = {};
        this.distributionByRoundedBeaconchainBalance = {};
        this.distributionByUnclaimedGNO = {};
        this.registeredValidators = 0;
    }

    async Process(){
        console.log(new Date(), "Starting check GNO balance in Gnosis Validators Deposit contract");

        const beaconBaseUrl = this.config.beaconBaseUrl;
        const executionBaseUrl = this.config.executionBaseUrl;
        
        try {
            const [finality, validatorsSnapshot] = await Promise.all([
                getFinalityCheckpoint({beaconBaseUrl}),
                fetchValidatorsSnapshot({ beaconBaseUrl, state: "head", verboseLog: true })
            ]);

            this.epoch = Number(finality?.data?.current_justified?.epoch);
            console.log(`|   └── Current epoch: ${ this.epoch}`);

            const arr = Array.isArray(validatorsSnapshot?.data) ? validatorsSnapshot.data : [];
            this.registeredValidators = arr.length;
            console.log(`|  ├── snapshot completed | registered validators: ${this.registeredValidators}`)

            let beacon_gno_sum = 0;
    
            for(const v of arr){
                const balance = (Number(v?.balance) / 32) || 0;
                beacon_gno_sum += balance;
                    
                const ww = this.NormalizeAddress(v?.validator?.withdrawal_credentials);

                // unique withdrawal addresses for checking unclaimed GNOs and validators count distribution per withdrawal address
                if(!this.withdrawalAddressSnapshot[ww]) this.withdrawalAddressSnapshot[ww] = { validators: 0, unclaimed_gno: 0 };
                
                this.withdrawalAddressSnapshot[ww].validators++;

                // distribution of GNO balance in validators
                const beaconHoldingsKey = (Math.round((balance / 1e9) * 100) / 100).toString();
                if(!this.distributionByRoundedBeaconchainBalance[beaconHoldingsKey]) this.distributionByRoundedBeaconchainBalance[beaconHoldingsKey] = 0;
                this.distributionByRoundedBeaconchainBalance[beaconHoldingsKey]++;
            }

            const withdrawalAddressesCount = Object.keys(this.withdrawalAddressSnapshot).length;
            console.log(`|  └── Withdrawal addresses: ${withdrawalAddressesCount}`);
            beacon_gno_sum = beacon_gno_sum / 1e9;
            console.log(`|      └── In GNO: ${beacon_gno_sum}`);

            try {
                const [GNO_unclaimed, contractGNO] = await Promise.all([
                    this.getUnclaimedGnoRewardsOnWallets(executionBaseUrl, Object.keys(this.withdrawalAddressSnapshot)),
                    getAssetbalance(executionBaseUrl, "0x0B98057eA310F4d31F2a452B414647007d1645d9", "0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb")
                ]);

                const contractGNO_gno = Number(contractGNO) / 1e18;
                const unclaimedGNO_gno = Number(GNO_unclaimed) / 1e18;
                const balance = contractGNO_gno - beacon_gno_sum - unclaimedGNO_gno;

                console.log("│  ┌── Results (all values in GNO):");
                console.log(`│  │   ├─ Validators total: ${beacon_gno_sum.toFixed(3)} GNO`);
                console.log(`│  │   ├─ Contract balance: ${contractGNO_gno.toFixed(3)} GNO`);
                console.log(`│  │   ├─ Unclaimed total: ${unclaimedGNO_gno.toFixed(3)} GNO`);
                console.log(`│  │   └─ Difference: ${balance.toFixed(3)} GNO`);
                
                console.log(`GNO distribution || Validators: ${this.registeredValidators} rounded GNO holdings:number of validators`, this.distributionByRoundedBeaconchainBalance);
                console.log(`Unclaimed GNO distribution || ${withdrawalAddressesCount} | output format: Unclaimed GNO : number of wallets`, this.distributionByUnclaimedGNO);

                const responseObj = {
                    time: new Date().getTime(),
                    epoch: this.epoch,
                    GNO_validators: beacon_gno_sum,
                    GNO_contract: Number(contractGNO) / 1e18,
                    GNO_unclaimed: Number(GNO_unclaimed) / 1e18,
                    balance: balance,
                    validators: this.registeredValidators,
                    beaconchain_distribution: this.distributionByRoundedBeaconchainBalance,
                    wallets: withdrawalAddressesCount,
                    unclaimed_distribution: this.distributionByUnclaimedGNO
                };
                console.log(new Date(), "process completed | Response object:", responseObj);
                return responseObj;
            } catch(e){
                console.error('failed:', e);
                throw e;
            }
        } catch(err){
            console.error('failed:', err);
            throw err;
        }
    };

    async getUnclaimedGnoRewardsOnWallets(executionBaseUrl, wallets){
        let sumWei = 0n;
        for(const tWallet of wallets){
            try {
                const weiValue = await getUnclaimedGNORewardsByWallet(executionBaseUrl, `0x${tWallet}`);
                this.withdrawalAddressSnapshot[tWallet].unclaimed_gno = Number(weiValue) / 1e18;; // attach unclaimed GNO to each wallet
                sumWei += weiValue;

                const unclaimedKey = (Math.round((Number(weiValue) / 1e18) * 100) / 100).toString();
                if(!this.distributionByUnclaimedGNO[unclaimedKey]) this.distributionByUnclaimedGNO[unclaimedKey] = 0;
                this.distributionByUnclaimedGNO[unclaimedKey]++;
            } catch(e){
                console.error(e);
            }
        }

        console.log(`|  └── Total unclaimed GNO (Wei): ${sumWei}`);
        console.log(`|       └── In GNO: ${Number(sumWei) / 1e18}`);
        return sumWei;
    }

    NormalizeAddress(address) {
        let normalized = address.replace(/^0x/, '');
        normalized = normalized.slice(-40);
        return normalized;
    };
}

async function runCalculateGnosisDepositContractBalance(args = {}) {
    const app = new CalculateGnosisDepositContractBalance();
    if (args.beaconBaseUrl)   app.config.beaconBaseUrl   = args.beaconBaseUrl;
    if (args.executionBaseUrl) app.config.executionBaseUrl = args.executionBaseUrl;
    return app.Process();
}

if (require.main === module) {
    (async () => {
        try {
            const app = new CalculateGnosisDepositContractBalance();
            if (typeof loadFromArgumentsUtil === 'function') loadFromArgumentsUtil(app.config);
            const res = await app.Process();
            const out = { type: 'complete', ...res };
            if (typeof process.send === 'function') process.send(out);
            await new Promise(r => process.stdout.write('@@COMPLETE@@ ' + JSON.stringify(out) + '\n', r));
            process.exit(0);
        } catch (e) {
            const errOut = { type: 'error', error: String(e?.message || e) };
            if (typeof process.send === 'function') process.send(errOut);
            await new Promise(r => process.stdout.write('@@ERROR@@ ' + JSON.stringify(errOut) + '\n', r));
            process.exit(1);
        }
    })();
} else {
    module.exports = { VERSION, runCalculateGnosisDepositContractBalance };
}