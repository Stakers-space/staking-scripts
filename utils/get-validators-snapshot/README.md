# JavaScript Utility to get validators snapshot for head state

## Prerequisites
- Synchronized and running beaconchain client with enabled API.

## Installation
- Check the `get-validators-snapshot.js` util
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/utils/get-validators-snapshot/get-validators-snapshot.js
```
- Create `/srv/stakersspace_utils` directory, if does not exist yet
```
sudo mkdir /srv/stakersspace_utils
```
- Download the script to `/srv/stakersspace_utils/` directory
```
sudo curl -o /srv/stakersspace_utils/get-validators-snapshot.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/utils/get-validators-snapshot/get-validators-snapshot.js
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
sudo chown -R stakersspace:stakersspace /srv/stakersspace_utils/get-validators-snapshot.js
```

## Use
```
const getSnapshot = require('/srv/stakersspace_utils/get-validators-snapshot.js');

(async () => {
    let beaconClientPort = 9596; // modify
    try {
        const json = await getSnapshot( beaconClientPort );
        console.log(json);
    } catch (err) {
        console.error('Error:', err.message);
    }
})();
```

### This util is required by following tools
- [Validators balance monitor](https://github.com/Stakers-space/staking-scripts/tree/main/monitor/validators_balance)