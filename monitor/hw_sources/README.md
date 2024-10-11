# Monitor Hardware resources

> [!IMPORTANT]  
> Util under construction

This utility script monitors SSD, RAM and SWAP usage and display the data through [stakers.space dashboard](https://stakers.space/account)

## Installation
- Check the `hw_usage_monitor.js` script
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/hw_sources/hw_usage_monitor.js
```
- Download the script to `/srv` directory
```
sudo curl -o /srv/hw_usage_monitor.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/hw_sources/hw_usage_monitor.js
```

## Launch The script
- Open crontab
```
crontab -e
```
- Add a new task into the cronetab
```
* 10 * * * /cesta/k/souboru/muj_skript.sh "accountId" "stakersspace_api_token"
```
> [!NOTE]  
> Replace * * * * * for your scheduled time frequency
> 1st * = minute (0 - 59) | keep * for each minute
> 2nd * = hour (0 - 23) | keep * for each hour
> 3rd * = day in a month (1 - 31) | keep * for each day
> 4th * = month (1 - 12) | keep * for each month
> 5th * = day in a week (0 - 7) - 0 as well as 7 means Sunday | keep * for each day

> [!IMPORTANT]  
> Replace `accountId` and `stakersspace_api_token`

- Show all planned tasks
```
crontab -l
```