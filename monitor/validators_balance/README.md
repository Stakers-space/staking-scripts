# Monitor Validators balance

This utility script monitors each active pubkey for its current balance.

> [!CAUTION]
> This util is under development. This is just a test release.

## Install
- Check the `validators_balance_checker.js` script
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_balance/validators_balance_checker.js
```
- Create `/srv/validators-monitor` directory, if does not exist yet
```
sudo mkdir /srv/validators-monitor
```
- Download the script to `/srv/validators-monitor/` directory
```
sudo curl -o /srv/validators-monitor/validators_balance_checker.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/validators_balance/validators_balance_checker.js
```

## Launch The script in Terminal
```
node /srv/validators-monitor/validators_balance_checker.js --port 9596
```