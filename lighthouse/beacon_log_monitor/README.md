# Beacon node log monitor for Lighthouse client

This utility script monitors lighthouse beacon log in real time and check its lines for defined regexs. The script allows to set any execution action of lighthouse beacon as well as any other service if certain issue is detected. There're attached known issue patterns for the lighthouse beacon log service through the `lighthousebeacon_tracking_records.txt` file.

## Installation
This script uses [.logmonitor.sh](https://github.com/Stakers-space/staking-scripts/tree/main/monitor/service_log) on background and extends it with a custom lighththousebeacon related configuration.
### Log Monitor utility
1. Check `.logmonitor.sh` availability
```
/usr/local/bin/logmonitor.sh version
```
If the shell script is not available, install it based on the installation guide at [Service Log Monitor](https://github.com/Stakers-space/staking-scripts/tree/main/monitor/service_log)


2. Download errors list for lighththousebeacon service
[Stakers.space](https://stakers.space) updates list with lighththousebeacon related errors occuring in a log. Take into notice that the file is kept as small as possible, containing only serious issues. High number of lines can increase CPU usage.
```
sudo curl -o /usr/local/etc/lighthousebeacon_tracking_records.txt https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/lighthouse/beacon_log_monitor/lighthousebeacon_tracking_records.txt
```
- Add / remove lines from the file anytime, if required
```
sudo nano /usr/local/etc/lighthousebeacon_tracking_records.txt
```
Keep the required line format of `targetType@triggerCount@targetString`, where:
- `errorType`: custom key under which the target is being tracked
- `@`: parser element
- `triggerCount` = trigger count (within specified time through `-d|--executor_trigger_periode` param) for executing an action
 - `@` = parser
- `errorString`: each log line is checked whether it contains this string.
> [!NOTE]
> There may be a need to resave the downloaded file for option to read from it.

### Log monitor executor utility
Executor utility allows to execute any action when certain pattern is reached (e.g. certain string found in a log for 50 times in a minute). Executor script is separated from `log_monitor`, as it's an optional extension of the `log_monitor` itself.

1. Check `.logmonitor_executor.sh` availability
```
/usr/local/bin/logmonitor_executor.sh version
```
If the shell script is not available, install it based on the installation guide at [Service Log Monitor](https://github.com/Stakers-space/staking-scripts/tree/main/monitor/service_log).

> [!NOTE]
> There's a best practice to use a general `logmonitor_executor.sh` for all logmonitor services, as it keeps all actions at one place.
> As the `logmonitor_executor.sh` is linked through a parameter in `lighthousebeacon_logmonitor.service` file, there's still an option to define individual `logmonitor_executor.sh` for each service.
> This can be done e.g. as
> ```
> sudo curl -o /usr/local/bin/logmonitor_executor_lighthousebeacon.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/service_log/logmonitor_executor.sh
> ```
> Then work with `logmonitor_executor_lighthousebeacon.sh` instead of `logmonitor_executor.sh`.

### Log monitor service
Log monitor service starts the log monitor with active executor utility (optional) automatically on OS startup.

- Download a service file `lighthousebeacon_logmonitor.service` for running `lighththousebeacon_logmonitor.sh` on system backgorund
```
sudo curl -o /etc/systemd/system/lighthousebeacon_logmonitor.service https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/lighthouse/beacon_log_monitor/lighthousebeacon_logmonitor.service
```
- Open the file and modify the configuration, if needed
```
sudo nano /etc/systemd/system/lighthousebeacon_logmonitor.service
```
- Start the service
```
sudo systemctl start lighthousebeacon_logmonitor.service
```
- Check the service running
```
systemctl status lighthousebeacon_logmonitor.service
```
> [!IMPORTANT]
> If the service did not start properly, it may require to set access to `journal` for the service user
>
> ```sudo usermod -aG systemd-journal <serviceUser>```

Check the service
```
journalctl -fu lighthousebeacon_logmonitor.service
```
Monitor the service together with lighththousebeacon service
```
journalctl -f -u lighththousebeacon.service -u lighthousebeacon_logmonitor.service
```
- Enable the service
```
sudo systemctl enable lighthousebeacon_logmonitor.service
```

> [!IMPORTANT]
> ### Set proper permissions for actions executed through the executor
> See section [Running Executor](https://github.com/Stakers-space/staking-scripts/tree/main/monitor/service_log#running-executor)
> - Setting in 
> ```
> sudo visudo
> ```
> in format
> ```
> specificServiceUser ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart sampleService
> ```