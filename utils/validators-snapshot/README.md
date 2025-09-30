# JavaScript Utility to fetch/process validators snapshot for head state

## Prerequisites
- Synchronized and running beaconchain client with enabled API.

## Installation
- Check the `validators-snapshot.js` util
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/utils/validators-snapshot/validators-snapshot.js
```
- Create `/srv/stakersspace_utils` directory, if does not exist yet
```
sudo mkdir /srv/stakersspace_utils
```
- Download the script to `/srv/stakersspace_utils/` directory
```
sudo curl -o /srv/stakersspace_utils/validators-snapshot.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/utils/validators-snapshot/validators-snapshot.js
```
- Define service user `stakersspace` (if does not exists yet)
```
sudo useradd --system --no-create-home --shell /bin/false stakersspace
```
- Add `stakersspace` user into the group with NodeJs user (if not added yet)
```
sudo usermod -aG myserveruser stakersspace
```
- Set file ownership dfirectory
```
sudo chown -R stakersspace:stakersspace /srv/stakersspace_utils/validators-snapshot.js
```

## Use `fetchSnapshot`
```
const { fetchSnapshot } = require('/srv/stakersspace_utils/validators-snapshot.js');

(async () => {
    let beaconClientPort = 9596; // modify
    try {
        const json = await fetchSnapshot({
            beaconBaseUrl: `http://localhost:${beaconClientPort}`,
            state: "head",
            statuses: ["active_ongoing", "active_exiting"],
            verboseLog: true
        });
        console.log(json);
    } catch (err) {
        console.error('Error:', err.message);
    }
})();
```
### Output
```
{"execution_optimistic":false,
   "finalized":false,
   "data":[
      {
            "index":"0",
            "balance":"0",
            "status":"withdrawal_done",
            "validator": {
               "pubkey":"...",
               "withdrawal_credentials":"...",
               "effective_balance":"0",
               "slashed":false,
               "activation_eligibility_epoch":"0",
               "activation_epoch":"0",
               "exit_epoch":"1156542",
               "withdrawable_epoch":"1156798"
            }
      },
      {
            "index":"1",
            ...
      },
      ...
```




### This util is required by following tools
- [Validators balance monitor](https://github.com/Stakers-space/staking-scripts/tree/main/monitor/validators_balance)
- [Remove keystores tool](https://github.com/Stakers-space/staking-scripts/tree/main/tools/remove-keystores)