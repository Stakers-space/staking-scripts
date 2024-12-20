# Authentization monitoring and alerts (succesfull as well as failed)
Be informed about each succesfull authentization as well as failed attempt to your Ubuntu Server

This script uses [Stakers.space api](https://stakers.space) for option to look at authentization history online as well as be triggered through an email notification

> [!IMPORTANT]
> Util Under construction

## Installation
- Look at the shell script
```curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/security/login_alert/authentization-watchdog.sh```
- Download shell script to your server
```sudo curl -o /usr/local/bin/authentization_watchdog.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/security/login_alert/authentization-watchdog.sh```

- Create `stakersspace` user, if does not exist yet
```sudo useradd --system --no-create-home --shell /bin/false stakersspace```

- Set ownership for the shell
```sudo chown -R stakersspace:stakersspace /usr/local/bin/authentization_watchdog.sh```

- Make the shell executible
```
chmod +x /usr/local/bin/authentization_watchdog.sh
```
- Test start
```
/usr/local/bin/authentization_watchdog.sh --account_id 0 --server_id 0 --api_token ""
```

- Add shell to the cron (check each minute)
Open the crontab
```
crontab -e
```
And add there following line
```
* * * * * /usr/local/bin/authentization_watchdog.sh --account_id 0 --server_id 0 --api_token ""
```