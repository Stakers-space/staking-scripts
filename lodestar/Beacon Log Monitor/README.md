# Beacon node log monitor for Lodestar clients

This utility script monitors lodestar beacon log in real time and check its lines for defined errors. The script allows to set any execution of lodestar beacon as well as any other serrvice if certain issue is detected.

> [!CAUTION]
> This script is not ready for production. It must be adjusted for real time log printed data by `lodestarbeacon`

## Installation
- View the script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/lodestar/Beacon%20Log%20Monitor/lodestarbeacon_logmonitor.sh
```
- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/bin/lodestarbeacon_logmonitor.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/lodestar/Beacon%20Log%20Monitor/lodestarbeacon_logmonitor.sh
```
- download error database files to `/usr/local/etc` directory
```
sudo curl -o /usr/local/etc/lodestar_logdb_exactErrors.txt https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/lodestar/Beacon%20Log%20Monitor/lodestar_logdb_exactErrors.txt
```
- Modify config, if required
Open `lodestarbeacon_logmonitor.sh`
```
sudo nano /usr/local/bin/lodestarbeacon_logmonitor.sh
```
Configuration arguments:
- `SERVICE`: Name of beaconchain service [Default value: `lodestarbeacon.service`]
- `exact_errors_file`: File with a list of errors to track [Default value: `/usr/local/etc/lodestar_logdb_exactErrors.txt"`]
- `MATCH_COUNT`: how many times the error must occur in a log in a given time to process defined action [Default value: `250`]
- `TRACKING_PERIOD`: perode within which occurations being accumulated for comparasion with $MATCH_COUNT [seconds]. [Default value: `600`]
- `PAUSE_SECONDS`:  periode for which to pause the script after processing a change [Default value: `900`]

- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/lodestarbeacon_logmonitor.sh
```

### Definition file
`/usr/local/bin/lodestarbeacon_logmonitor.sh` shell script controls logs for string targets defined at `/usr/local/etc/lodestar_tracking_records.txt`.
There is one target at each line in a format of ```targetType@targetString```, where:
- `targetType`: custom key under which the target is being tracked
- `@`: parser element
- `targetString`: each log line is checked whether it contains this string.


## Run the service
`lodestarbeacon_logmonitor.sh` is running under definned configuration that is taken from following place
1. Right from variables defined inside the `lodestarbeacon_logmonitor.sh` shell script
2. From `config/clients.conf` and `config/logmonitor.conf` files (overrides values in step 1)
3. From attached parameters to the shell script on startion (overrides values in step 2)
```
/usr/local/bin/lodestarbeacon_logmonitor.sh --service="lodestarbeacon" --definition_file="/usr/local/etc/lodestar_tracking_records.txt" --triggercount=100 --tracking_periode=600 --pause_tracking=900
```
Arguments
-  `-s` | `--service` = service name
- `-df` | `--definition_file` = file with defined strings the monitor search in the real time log
- `-tc` | `--triggercount` = number of occurences (found results) to execute defined trigger
- `-tp` | `--tracking_periode` [seconds] = periode during each `triggercount` is accumulated. After that time accumulated count is reseted back to 0
- `-pt` | `pause_tracking` [seconds] = for what time to pause the script after processed execution (it helps to estabilish the running before starting checking the log again)


## [Optional]  Run the service on background
> [!NOTE]
> Steps below expects you are running Lodestar beacon under `lodestarbeacon` service.

Set files ownership
```
sudo chown -R lodestarbeacon:lodestarbeacon /usr/local/bin/lodestarbeacon_logmonitor.sh
```
```
sudo chown -R lodestarbeacon:lodestarbeacon /usr/local/etc/lodestar_logdb_exactErrors.txt
```

### Download service file
- Download a service file `lodestarbeacon_logmonitor.service` for running `lodestarbeacon_logmonitor.sh` on system backgorund
```
sudo curl -o /etc/systemd/system/lodestarbeacon_logmonitor.service https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/lodestar/Beacon%20Log%20Monitor/lodestarbeacon_logmonitor.service
```

### Start the service
Enable the service
```
sudo systemctl enable lodestarbeacon_logmonitor.service
```
Start the service
```
sudo systemctl start lodestarbeacon_logmonitor.service
```

### Monitor the service
```
systemctl status lodestarbeacon_logmonitor.service
```
```
journalctl -u lodestarbeacon_logmonitor.service
```

