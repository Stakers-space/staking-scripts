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
- Update data in the sample `public_keys_testlist.json` or change the file


## Launch The script
```
node /srv/validators-monitor/validators_state_checker.js --pubkeys ./public_keys_testlist.json
```
### Params
- `--port` - beaconchain port. Default value: `9596` 
- `--epochsoffline_trigger` - Number of successive epochs for which the validator ID must be reported as offline to trigger notification. Default value: `4`
- `--pubkeys` - Path to pubkeys file. Default value: `./public_keys_testlist.json`
- `--pubkeys_dynamic` - Reload file for each epoch. Default value: `false`

## Set auto start on system startup
- Check the `validators-state-monitor.service` file
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_state/validators-state-monitor.service
```
- Download the script to `/etc/systemd/system` directory
```
sudo curl -o /etc/systemd/system/validators-state-monitor.service https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_state/validators-state-monitor.service
```
- Edit service params
```
sudo nano /etc/systemd/system/validators-state-monitor.service
```
```
sudo systemctl daemon-reload
```
- Start the service
```
sudo systemctl start validators-state-monitor.service
```
- Monitor the service
```
systemctl status validators-state-monitor.service
```
```
journalctl -u validators-state-monitor.service
```
- Activate automatic start on OS startup
```
sudo systemctl enable validators-state-monitor.service
```
- Deactivate automatic start on OS startup
```
sudo systemctl disable validators-state-monitor.service
```