# Beacon node log monitor for Teku client

This utility script monitors teku beacon log in real time and check its lines for defined errors. The script allows to set any execution action of teku beacon as well as any other service if certain issue is detected. There're attached known issue patterns for the teku beacon log service through the `teku_tracking_records.txt` file.

## Installation
This script uses [.logmonitor.sh](https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor) on background and extends it with a custom tekubeacon related configuration.
### Log Monitor utility
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
sudo curl -o /usr/local/etc/teku_tracking_records.txt https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/teku/beacon_log_monitor/teku_tracking_records.txt
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

### Log monitor executor utility
Executor utility allows to execute any acction when certain pattern is reached (e.g. certain string found in a log for 50 times in a minute). Executor script is separated from `log_monitor`, as it's an optional extension of the `log_monitor` itself.

`logmonitor_executor.sh` is attached to `log_monitor` utility as a parameter and as so it may be individual for each service. Do not hesitate to rename it for your custom clear service related name.

1. Check `.logmonitor_executor.sh` availability
```
/usr/local/bin/logmonitor_executor.sh version
```
If the shell script is not available, install it
- View the script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/log_monitor/logmonitor_executor.sh
```
- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/logmonitor_executor_tekubeacon.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/log_monitor/logmonitor_executor.sh
```
- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/logmonitor_executor_tekubeacon.sh
```
- Open the file and configurate execution actions
```
sudo nano /usr/local/bin/logmonitor_executor_tekubeacon.sh
```
- Executor is activated by adding executor-related arguments on launching `/usr/local/bin/logmonitor.sh`, see service file below.

### Log monitor sleeper utility
`logmonitor_sleeper.sh` checks log for regular updates. Once there's no new line for certain defined periode, it may be considered that the service is stucked. In such case sleeper utility allows automatically restart it. The utility allows to configurate the maximum waiting time for new line as well as action to execute on occuration.

1. Check `.logmonitor_sleeper.sh` availability
```
/usr/local/bin/logmonitor_sleeper.sh version
```
If the shell script is not available, install it
- View the script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/log_monitor/logmonitor_sleeper.sh
```
- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/logmonitor_sleeper_tekubeacon.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/log_monitor/logmonitor_sleeper.sh
```
- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/logmonitor_sleeper_tekubeacon.sh
```
- Open the file and configurate execution actions
```
sudo nano /usr/local/bin/logmonitor_sleeper_tekubeacon.sh
```
- Sleeper is activated by adding executor-related arguments on launching `/usr/local/bin/logmonitor.sh`, see service file below.


### Log monitor service
Log monitor service starts the log monitor with active executor and sleeper utility (both optionals) automatically on OS startup.


- Download a service file `tekubeacon_logmonitor.service` for running `tekubeacon_logmonitor.sh` on system backgorund
```
sudo curl -o /etc/systemd/system/tekubeacon_logmonitor.service https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/teku/beacon_log_monitor/tekubeacon_logmonitor.service
```
- Open the file and modify the configuration, if needed
```
sudo nano /etc/systemd/system/tekubeacon_logmonitor.service
```
- Start the service
```
sudo systemctl start tekubeacon_logmonitor.service
```
- Check the service running
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

- Enable the service
```
sudo systemctl enable tekubeacon_logmonitor.service
```