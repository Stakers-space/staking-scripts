# Monitor Validators state (online/offline)

This utility script monitors each pubkey from the list under `pubKeysList` param. See example list file [`public_keys_testlist.json`](https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_state/public_keys_testlist.json)

> [!NOTE]
> The tool is under construction

## Installation
- Check the `validators_state_checker.js` script
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_state/validators_state_checker.js
```
- Download the script to `/srv/validators-monitor/` directory
```
sudo curl -o /srv/validators-monitor/validators_state_checker.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_state/validators_state_checker.js
```
- Download the sample  `public_keys_testlist.json` file
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_state/public_keys_testlist.json
```
```
sudo curl -o /srv/validators-monitor/public_keys_testlist.json https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_state/public_keys_testlist.json
```

## Launch The script
```
node /srv/validators-monitor/validators_state_checker.js
```