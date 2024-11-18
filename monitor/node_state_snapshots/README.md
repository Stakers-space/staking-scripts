# Monitor Hardware resources

This utility script monitors SSD, RAM / SWAP usage and network data and make the data accessible through [stakers.space dashboard](https://stakers.space/account)

![Resources usage Chart](https://github.com/Stakers-space/staking-scripts/blob/main/monitor/node_state_snapshots/server-resources-chart.png?raw=true)

## Installation
- Check the `node_snapshots.sh` script
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/monitor/node_state_snapshots/node_snapshots.sh
```
- Download the script to `/srv` directory
```
sudo curl -o /srv/node_snapshots.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/monitor/node_state_snapshots/node_snapshots.sh
```
- Enable launching the script
```
sudo chmod +x /srv/node_snapshots.sh
```
- Change script ownership
```
sudo chown anyUser:anyUser /srv/node_snapshots.sh
```

## Launch The script
- Open crontab
```
crontab -e
```
- Add a new task into the cronetab
```
0 * * * * /srv/node_snapshots.sh "accountId" "stakersspace_api_token" "serverId"
```
> [!NOTE]  
> Replace * * * * * for your scheduled time frequency
> 1st * = minute (0 - 59) | keep * for each minute
>
> 2nd * = hour (0 - 23) | keep * for each hour
>
> 3rd * = day in a month (1 - 31) | keep * for each day
>
> 4th * = month (1 - 12) | keep * for each month
>
> 5th * = day in a week (0 - 7) - 0 as well as 7 means Sunday | keep * for each day

> [!IMPORTANT]
> Replace `accountId`, `stakersspace_api_token` and `serverId`

- Show all planned tasks
```
crontab -l
```