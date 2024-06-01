# Utility shell scripts that restarts erigon service every day at 15:30 PM
This script was written based on often stucking of Erigon service on Gnosis chain. Regular restarting helps to keep the client running smooth.

## Prerequisites / Dependencies
Erigon client

## Installation

1. Download the file
- View the service file
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/erigon/Regular%20restart/erigon_restart.service
```
- download the service file to `/etc/systemd/system` directory
```
sudo curl -o /etc/systemd/system/erigon_restart.service https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/erigon/Regular%20restart/erigon_restart.service
```
> [!NOTE]
> If you are running `erigon` client under custom name (e.g. `gno-erigon`), change the output file parameter `erigon_restart.service` to your custom erigon service name.
> 
> Sample: Your erigon client running under `gno-erigon_restart.service`
> Your link will look as follow
> ```
> sudo curl -o /etc/systemd/system/gno-erigon_restart.service https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/erigon/Regular%20restart/erigon_restart.service
> ```
> Open the downlaoded file
> ```
> sudo nano '/etc/systemd/system/gno-erigon_restart.service'
> ```
> Find following line
>```
> ExecStart=/bin/systemctl restart erigon.service
> ```
> Replace `erigon.service` for `gno-erigon.service`


2. Download timer file
- View the timer file
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/erigon/Regular%20restart/erigon_restart.timer
```
- download the service file to `/etc/systemd/system` directory
```
sudo curl -o /etc/systemd/system/erigon_restart.timer https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/erigon/Regular%20restart/erigon_restart.timer
```
> [!NOTE]
> If you are running `erigon` client under custom name (e.g. `gno-erigon`), change the output file parameter `erigon_restart.timer` to your custom erigon service name.
> Sample: Your erigon client running under `gno-erigon_restart.timer`
> Your link will look as follow
> ```
> sudo curl -o /etc/systemd/system/gno-erigon_restart.timer https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/erigon/Regular%20restart/erigon_restart.timer
> ```

> [!IMPORTANT]
> Change time from `OnCalendar=*-*-* 15:30:00` to prevent all users using the file restarting the service in the same time
> Open the downloaded file
> ```
> sudo nano '/etc/systemd/system/erigon_restart.timer'
> ```
> Find line `OnCalendar=*-*-* 15:30:00` and change the tiem value to anz preferrer

3. Reload daemon-reload
```
sudo systemctl daemon-reload
```

4. Enable your `erigon_restart.service` service file
```
sudo systemctl enable erigon_restart.service
```

5. Enable and start the timer
```
sudo systemctl enable erigon_restart.timer
```
```
sudo systemctl start erigon_restart.timer
```

Monitor the utility running
```
journalctl -u erigon_restart.service
```