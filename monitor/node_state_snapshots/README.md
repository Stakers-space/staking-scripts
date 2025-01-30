# Monitor Hardware resources

This utility script monitors SSD, RAM / SWAP usage and network data and make the data accessible through [stakers.space dashboard](https://stakers.space/account)

![Resources usage Chart](https://github.com/Stakers-space/staking-scripts/blob/main/monitor/node_state_snapshots/server-resources-chart.png?raw=true)

## Features
- Tracking data on server and automatic sending of them to the [StakersSpace cloud](https://stakers.space/). Data is sent at a custom interval defined in `crontab`, and displazed in a time chart on [StakersSpace dashboard](https://stakers.space/dashboard). The dashboard displays the last 100 timeframes.
    - Disk usage is percentages
    - Ram usage in percentages
    - SWAP memmory usage in percentages
    - Number of connected peers in the beacon client (supports all clients, including Lighthouse, Lodestar, Teku, Prysm, Nimbus, etc.)
    - VPN status – connection state to the VPN + VPN server identification (supports general WireGuard configuration and the Mullvad VPN client)
    - Option to send data to an alternative server (see `api_url` flag)

## Util Installation
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

## Test The Util
```
/srv/node_snapshots.sh --account_id 0 --server_id 0 --api_token "test" --beacon_port 5052 --donotsend 1
```
> [!IMPORTANT]
> Replace `account_id`, `server_id` and `api_token` values
> `beacon_port` default values for clients
> Lighthouse, Nimbus: `5052`
> Teku: `5051`
> Lodestar: `9596`
> Prysm: `3500`

## Configurate regular execution of the node snapshot processing
- Open crontab
```
crontab -e
```
- Add a new task into the cronetab
```
*/10 * * * * /srv/node_snapshots.sh --account_id 0 --server_id 0 --api_token "test" --beacon_port 5052
```
> [!NOTE]  
> Replace * * * * * for your scheduled time frequency
> 1st * = minute (0 - 59) | keep * for each minute, */10 = execute every 10th minute
>
> 2nd * = hour (0 - 23) | keep * for each hour
>
> 3rd * = day in a month (1 - 31) | keep * for each day
>
> 4th * = month (1 - 12) | keep * for each month
>
> 5th * = day in a week (0 - 7) - 0 as well as 7 means Sunday | keep * for each day
>
> Remove `--donotsend 1` param for production (enabling sending data to the API URL)

- Show all planned tasks
```
crontab -l
```