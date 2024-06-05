# Beacon node log monitor for Teku client

This utility script monitors teku beacon log in real time and check its lines for defined errors. The script allows to set any execution of teku beacon as well as any other serrvice if certain issue is detected.

## Installation
This script uses [.logmonitor.sh](https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor) on background and extends it with a custom tekubeacon related configuration.
1. Check `.logmonitor.sh` availability
```
/usr/local/bin/logmonitor.sh version
```
If the shell script is not available, install it
- View the script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/log_monitor/logmonitor.sh
```
- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/logmonitor.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/log_monitor/logmonitor.sh
```
- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/logmonitor.sh
```

2. Download errors list for tekubeacon service
[Stakers.space](https://stakers.space) updates list with tekubeacon related errors occuring in a log. Take into notice that the file is kept as small as possible, containing only serious issues. High number of lines can increase CPU usage.
```
sudo curl -o /usr/local/etc/teku_tracking_records.txt https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/teku/Beacon%20Log%20Monitor/teku_tracking_records.txt
```
- Add / remove lines from the file anytime, if required
```
sudo nano /usr/local/etc/teku_tracking_records.txt
```
Keep the required line format of `targetType@targetString`, where:
- `errorType`: custom key under which the target is being tracked
- `@`: parser element
- `errorString`: each log line is checked whether it contains this string.
> [!NOTE]
> There may be a need to resave the downloaded file for option to read from it.

3. Configurate executor utility


4. Configurate sleeper utility


5. Configurate Log motitor service


## Run the log monitor service
### Start the service
Enable the service
```
sudo systemctl enable tekubeacon_logmonitor.service
```
Start the service
```
sudo systemctl start tekubeacon_logmonitor.service
```

### Monitor the service
```
systemctl status tekubeacon_logmonitor.service
```
```
journalctl -fu tekubeacon_logmonitor.service
```
Monitor the service together with tekubeacon service
```
journalctl -f -u tekubeacon.service -u tekubeacon_logmonitor.service
```


### Definition file
`/usr/local/bin/tekubeacon_logmonitor.sh` shell script controls logs for string targets defined at `/usr/local/etc/teku_tracking_records.txt`.
There is one target at each line in a format of 

## Run the service
`tekubeacon_logmonitor.sh` is running under definned configuration that is taken from following place
1. Right from variables defined inside the `tekubeacon_logmonitor.sh` shell script
2. From `config/clients.conf` and `config/logmonitor.conf` files (overrides values in step 1)
3. From attached parameters to the shell script on startion (overrides values in step 2)
```
/usr/local/bin/tekubeacon_logmonitor.sh --service="tekubeacon" --definition_file="/usr/local/etc/nethermind_tracking_records.txt" --triggercount=100 --tracking_periode=600 --pause_tracking=900
```
Arguments
-  `-s` | `--service` = service name
- `-df` | `--definition_file` = file with defined strings the monitor search in the real time log
- `-tc` | `--triggercount` = number of occurences (found results) to execute defined trigger
- `-tp` | `--tracking_periode` [seconds] = periode during each `triggercount` is accumulated. After that time accumulated count is reseted back to 0
- `-pt` | `pause_tracking` [seconds] = for what time to pause the script after processed execution (it helps to estabilish the running before starting checking the log again)


## [Optional]  Run the service on background
> [!NOTE]
> Steps below expects you are running Lodestar beacon under `tekubeacon` service.

Set files ownership
```
sudo chown tekubeacon:tekubeacon /usr/local/bin/tekubeacon_logmonitor.sh
```
```
sudo chown tekueacon:tekubeacon /usr/local/etc/teku_tracking_records.txt
```

### Download service file
- Download a service file `tekubeacon_logmonitor.service` for running `tekubeacon_logmonitor.sh` on system backgorund
```
sudo curl -o /etc/systemd/system/tekubeacon_logmonitor.service https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/teku/Beacon%20Log%20Monitor/tekubeacon_logmonitor.service
```

