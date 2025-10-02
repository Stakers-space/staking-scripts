# Monitor Validators balance

This utility script monitors each active pubkey for its current balance.

## Install
- Install Prerequisities (if they are not on the sever, yet)
    - [Beacon API Lib](https://github.com/Stakers-space/staking-scripts/tree/main/libs/beacon-api)
    - [Load From Process Arguments](https://github.com/Stakers-space/staking-scripts/tree/main/libs/load-from-process-arguments)

- Check the `validators_balance_collector.js` script
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_balance/validators_balance_collector.js
```
- Create `/srv/validators-monitor` directory, if does not exist yet
```
sudo mkdir /srv/validators-monitor
```
- Download the script to `/srv/validators-monitor/` directory
```
sudo curl -o /srv/validators-monitor/validators_balance_collector.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_balance/validators_balance_collector.js
```

## Launch The script in Terminal
```
node /srv/validators-monitor/validators_balance_collector.js --beaconChain.port 9596 --frequencySeconds 3000
```

## Configurate service
- Define service user `stakersspace` (if does not exists yet)
```
sudo useradd --system --no-create-home --shell /bin/false stakersspace
```
- Add `stakersspace` user into the group with NodeJs user
```
sudo usermod -aG myserveruser stakersspace
```
- Set ownership of the service directory
```
sudo chown -R stakersspace:stakersspace /srv/validators-monitor
```
- Check the `validators-balance-monitor.service` file
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_balance/validators-balance-monitor.service
```
- Download the script to `/etc/systemd/system` directory
```
sudo curl -o /etc/systemd/system/validators-balance-monitor.service https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_balance/validators-balance-monitor.service
```
- Edit service params
```
sudo nano /etc/systemd/system/validators-balance-monitor.service
```
```
sudo systemctl daemon-reload
```
- Start the service
```
sudo systemctl start validators-balance-monitor.service
```
- Monitor the service
```
systemctl status validators-balance-monitor.service
```
```
journalctl -f -u validators-balance-monitor.service
```

### Configurate auto start on system startup
- Activate automatic start on OS startup
```
sudo systemctl enable validators-balance-monitor.service
```
- Deactivate automatic start on OS startup
```
sudo systemctl disable validators-balance-monitor.service
```