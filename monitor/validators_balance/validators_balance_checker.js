const getValidatorsSnapshotUtil = require('../../utils/get-validators-snapshot/get-validators-snapshot');

class GetValidatorsBalance {
    constructor(beaconChainPort = 9596){
        this.config = {
            beaconChainPort: beaconChainPort
        }
    }

    LoadConfigFromArguments(){
        const args = process.argv.slice(2); // Cut first 2 arguments (node & script)
        const params = [
            {"--port": "beaconChainPort"}
        ];

        for (const param of params) {
            for (const [key, value] of Object.entries(param)) {
                const paramIndex = args.indexOf(key);
                if (paramIndex !== -1 && paramIndex + 1 < args.length) {
                    const paramValue = args[paramIndex + 1];
                    setNestedProperty(this, value, paramValue);
                    console.log(`├─ ${value} set to: ${paramValue} from attached param`);
                }
            }
        }

        // Helper function to set nested properties
        function setNestedProperty(obj, path, value) {
            const keys = path.split('.');
            let current = obj;

            if (value === "true") value = true;
            else if (value === "false") value = false;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!(keys[i] in current)) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
        }
    }

    async run(){
        try {
            const json = await getValidatorsSnapshotUtil(this.config.beaconChainPort);
            console.log(json);

            let stateObject = {}; // key: [pubid, state, balance]
            for(const val of json){
                // ...
            }


        } catch (err){
            console.error('Error:', err.message || err);
        }
    }
}

const generateProcess = new GetValidatorsBalance();
generateProcess.run();