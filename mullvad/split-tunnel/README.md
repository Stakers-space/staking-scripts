# Utility shell to set VPN split tunnel for timedatectl service

## Intro
With a certain ISP configuration, requests to `timedatectl` service going over VPN may be blocked. To prevent going out of sync time,, this scripts does regular checks of time synchronization and in a case of detected `out of sync` state, it configurates a VPN split tunnel for `timedatectl` service.

## Prerequisites / Dependencies
Installed Mullvad VPN client on the Ubuntu Server

## mullvad_split_split_tunnel_set.sh Installation
On a start, `mullvad_split_split_tunnel_set.sh` checks `timedatectl status`, and if `System clock synchronized` has `no` value, it sets VPN split tunnel for `systemd-timesyncd` on Mullvad cli.

From a home directory
```
cd ~
```
1. Download the mullvad_split_split_tunnel_set.sh script
```
curl -o https://raw.githubusercontent.com/Stakers-space/ShellScripts/main/mullvad/split-tunnel/mullvad_split_split_tunnel_set.sh
```

2. Check the file
```
nano ~/mullvad_split_split_tunnel_set.sh
```

3. Move the file to `/usr/local/bin`
```
sudo mv ~/mullvad_split_split_tunnel_set.sh /usr/local/bin
```

4. Enable execution of the shell script
sudo chmod +x /usr/local/bin/mullvad_split_tunnel_setup.sh

### Create Service file for launching `mullvad_split_split_tunnel_set.sh`
Service file serves for automatical launching of `mullvad_split_split_tunnel_set.sh`.

From a home directory
```
cd ~
```
1. Download `servicetime_sync_check.service` file
```
curl -o https://raw.githubusercontent.com/Stakers-space/ShellScripts/main/mullvad/split-tunnel/servertime_sync_check.service
```

2. Check the downloaded file
```
sudo nano ~/servertime_sync_check.service
```

3. Check / Set proper permissions for the file


4. Move the file to `/etc/systemd/system`
```
sudo mv ~/servertime_sync_check.service /etc/systemd/system
```

5. Enable the `servertime_sync_check.service`
```
sudo systemctl enable servertime_sync_check.service
```


### Create timer file for `servertime_sync_check.service`
Timer file running the service file at regular intervals (30 minutes)

From a home directory
```
cd ~
```
1. Download `servicetime_sync_check.timer` file
```
curl -o https://raw.githubusercontent.com/Stakers-space/ShellScripts/main/mullvad/split-tunnel/servertime_sync_check.timer
```
2. Check the downloaded file
```
sudo nano ~/servertime_sync_check.timer
```

3. Check / Set proper permissions for the file

4. Move the file to `/etc/systemd/system`
```
sudo mv ~/servertime_sync_check.timer /etc/systemd/system
```

5. Reload systemd
```
sudo systemctl daemon-reload
```

6. Enable and start the timer service
```
sudo systemctl enable servertime_sync_check.timer
sudo systemctl start servertime_sync_check.timer
```


Service log can be viewed through journalctl
```
journalctl -u servertime_sync_check.service
```