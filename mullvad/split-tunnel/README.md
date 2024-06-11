# Utility shell to set VPN split tunnel for timedatectl service

## Intro
With a certain ISP configuration, requests to `timedatectl` service going over VPN may be blocked. To prevent going out of sync time,, this scripts does regular checks of time synchronization and in a case of detected `out of sync` state, it configurates a VPN split tunnel for `timedatectl` service.

## Prerequisites / Dependencies
Installed Mullvad VPN client on the Ubuntu Server

## mullvad_split_split_tunnel_set.sh Installation
On a start, `mullvad_split_split_tunnel_set.sh` checks `timedatectl status`, and if `System clock synchronized` has `no` value, it sets VPN split tunnel for `systemd-timesyncd` on Mullvad cli.


1. Check the `mullvad_split_split_tunnel_set.sh` script
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/mullvad/split-tunnel/mullvad_split_tunnel_set.sh
```

2. Download the `mullvad_split_split_tunnel_set.sh` script
```
sudo curl -o /usr/local/bin/mullvad_split_tunnel_set.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/mullvad/split-tunnel/mullvad_split_tunnel_set.sh
```

3. Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/mullvad_split_tunnel_set.sh
```

### Create Service file for launching `mullvad_split_split_tunnel_set.sh`
Service file serves for automatical launching of `mullvad_split_split_tunnel_set.sh`.

1. Download `servicetime_sync_check.service` file
```
sudo curl -o /etc/systemd/system/servertime_sync_check.service https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/mullvad/split-tunnel/servertime_sync_check.service
```

2. Open the file and modify the configuration, if needed
```
sudo nano /etc/systemd/system/servertime_sync_check.service
```

3. Start the service
```
sudo systemctl start servertime_sync_check.service
```
4. Check the service running
```
systemctl status servertime_sync_check.service
```
```
journalctl -fu servertime_sync_check.service
```
5. Enable the `servertime_sync_check.service`
```
sudo systemctl enable servertime_sync_check.service
```

### Create timer file for `servertime_sync_check.service`
Timer file running the service file at regular intervals (30 minutes)

1. Download `servicetime_sync_check.timer` file
```
sudo curl -o /etc/systemd/system/servertime_sync_check.timer https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/mullvad/split-tunnel/servertime_sync_check.timer
```
2. Open the file and modify the configuration, if needed
```
sudo nano /etc/systemd/system/servertime_sync_check.timer
```
3. Start the service
```
sudo systemctl start servertime_sync_check.timer
```
4. Check the service running
```
systemctl status servertime_sync_check.timer
```
```
journalctl -fu servertime_sync_check.timer
```
5. Enable the `servertime_sync_check.timer`
```
sudo systemctl enable servertime_sync_check.timer
```