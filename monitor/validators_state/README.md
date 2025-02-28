# Monitor Validators state (online/offline)

This utility script monitors each pubkey from the list under `pubKeysList` param. See example list file [`public_keys_testlist.json`](https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_state/public_keys_testlist.json)

## Supported networks:
- Ethereum
- Gnosis

Network recognization is automatical, based on `deposit contract address` returned from [BeaconChain client API](https://github.com/Stakers-space/staking-scripts/tree/main/api_general/beacon-client).

> [!NOTE]
> This util allows to track status of your validators on your own. If you prefer external monitoring, you can just simply set your pubkeys at [https://stakers.space/account](https://stakers.space/account) service. All sensitive data are encrypted.

## Installation
- Check the `validators_state_checker.js` script
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_state/validators_state_checker.js
```
- Create `/srv/validators-monitor` directory, if does not exist yet
```
sudo mkdir /srv/validators-monitor
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
node /srv/validators-monitor/validators_state_checker.js --port 9596 --pubkeys /srv/validators-monitor/public_keys_testlist.json
```
### Params
- `--port` - beaconchain client API port. Check [Beacon client API page](https://github.com/Stakers-space/staking-scripts/tree/main/api_general/beacon-client) to get value for your client. Default value: `9596`
- `--epochsoffline_trigger` - Number of successive epochs for which the validator ID must be reported as offline to trigger notification. Default value: `4`
- `--pubkeys` - Path to pubkeys file. Default value: `./public_keys_testlist.json`
- `--pubkeys_dynamic` - Reload file for each epoch. Default value: `false`
- Optional params
    - `--post` - Post state data on server. Default value: `false`
    - `--encryption`: Use extra data encryption. Default value: `true`
    - `--token_api`: Token for posting data to [Stakers.space dashboard](https://stakers.space/account)
    - `--server_id`: Server Id identificator for simple recognization of source of the data

## Configurate service
- Define service user `stakersspace` (if does not exists yet)
```
sudo useradd --system --no-create-home --shell /bin/false stakersspace
```
- Add `stakersspace` user into the group with NodeJs user
```
sudo usermod -aG myserveruser stakersspace
```
- Set ownership of the service dfirectory
```
sudo chown -R stakersspace:stakersspace /srv/validators-monitor
```
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
journalctl -f -u validators-state-monitor.service
```

### Configurate auto start on system startup
- Activate automatic start on OS startup
```
sudo systemctl enable validators-state-monitor.service
```
- Deactivate automatic start on OS startup
```
sudo systemctl disable validators-state-monitor.service
```