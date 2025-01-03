# Validator client log monitor for Lodestar validator

This utility script monitors lodestar validator client log in real time and check its lines for defined errors. The script allows to set any execution action of lodestar validator as well as any other service if certain issue is detected. There're attached known issue patterns for the lodestar validator log service through the `lodestarvalidator_tracking_records.txt` file.

## Installation
This script uses Service log monitor shell [.logmonitor.sh](https://github.com/Stakers-space/staking-scripts/tree/main/monitor/service_log) on background and extends it with a custom `lodestarvalidator` related configuration.

## Log Monitor utility
1. Check `.logmonitor.sh` availability
```
/usr/local/bin/logmonitor.sh version
```
If the shell script is not available, install it
- View the script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/service_log/logmonitor.sh
```
- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/bin/logmonitor.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/service_log/logmonitor.sh
```
- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/logmonitor.sh
```

## Errors list for lodestarvalidator service
[Stakers.space](https://stakers.space) updates list with lodestarvalidator related errors occuring in a log. Take into notice that the file is kept as small as possible, containing only serious issues. High number of lines can increase CPU usage.
```
sudo curl -o /usr/local/etc/lodestarvalidator_tracking_records.txt https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/lodestar/validator_log_monitor/lodestarvalidator_tracking_records.txt
```
- Add / remove lines from the file anytime, if required
```
sudo nano /usr/local/etc/lodestarvalidator_tracking_records.txt
```
Keep the required line format of `targetType@targetString`, where:
- `errorType`: custom key under which the target is being tracked
- `@`: parser element
- `errorString`: each log line is checked whether it contains this string.
> [!NOTE]
> There may be a need to resave the downloaded file for option to read from it.

## Log monitor executor utility
Executor utility allows to execute any action when certain pattern is reached (e.g. certain string found in a log for 50 times in a minute). Executor script is separated from `log_monitor`, as it's an optional extension of the `log_monitor` itself.

`logmonitor_executor.sh` is attached to `log_monitor` utility as a parameter and as so it may be individual for each service. Do not hesitate to rename it for your custom clear service related name.

- Check `.logmonitor_executor.sh` availability
```
/usr/local/bin/logmonitor_executor_lodestarvalidator.sh version
```
If the shell script is not available, install it
- View the script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/lodestar/validator_log_monitor/logmonitor_executor_lodestarvalidator.sh
```
- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/bin/logmonitor_executor_lodestarvalidator.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/lodestar/validator_log_monitor/logmonitor_executor_lodestarvalidator.sh
```
- Open the file and configurate execution actions
```
sudo nano /usr/local/bin/logmonitor_executor_lodestarvalidator.sh
```
- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/logmonitor_executor_lodestarvalidator.sh
```
- Executor is activated by adding executor-related arguments on launching `/usr/local/bin/logmonitor.sh`, see service file below.

> [!IMPORTANT]  
> When using `logmonitor_executor_lodestarvalidator.sh` for removing database file, there is a need to apply a measure before being slashed of following situation:
> 1. DB Corruption error is detected → logmonitor_executor_lodestarvalidator.sh removes database
> 2. For any reason, the server is restarted (e.g, quick power failure)
> 3. Server automatically starts and launches validator instance before a secure time
> A simple prevention is not to use `enable` for launching validator services, but [Start With Delay](https://github.com/Stakers-space/staking-scripts/tree/main/utils/start_with_delay) util instead

## Log monitor service
Log monitor service starts the log monitor with active executor utility (optional) automatically on OS startup.

- Download a service file `lodestarvalidator_logmonitor.service` for running `lodestarvalidator_logmonitor.service` on system backgorund
```
sudo curl -o /etc/systemd/system/lodestarvalidator_logmonitor.service https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/lodestar/validator_log_monitor/lodestarvalidator_logmonitor.service
```
- Open the file and modify the configuration, if needed
```
sudo nano /etc/systemd/system/lodestarvalidator_logmonitor.service
```
- Start the service
```
sudo systemctl start lodestarvalidator_logmonitor.service
```
- Check the service running
```
systemctl status lodestarvalidator_logmonitor.service
```
```
journalctl -fu lodestarvalidator_logmonitor.service
```
> [!NOTE]  
> If the service did not start properly, it mey require to set access to `journal` for the service user
>
> ```sudo usermod -aG systemd-journal <serviceUser>```
>

Monitor the service together with lodestarvalidator service
```
journalctl -f -u lodestarvalidator.service -u lodestarvalidator_logmonitor.service
```
- Enable the service
```
sudo systemctl enable lodestarvalidator_logmonitor.service
```

> [!NOTE]  
> There's a need to set proper permission settings for starting / stoping the service despite there is the same user behind validator and validator_monitor service.
> - Open Suborders file
> ```sudo visudo```
> - Add serviceUser specific permissions for specified service
>
> ```validatorservice ALL=(ALL) NOPASSWD: /usr/bin/systemctl stop validatorservice, /usr/bin/systemctl start validatorservice, /usr/bin/rm -r /var/lib/lodestar/validators/i1/cache, /usr/bin/rm -r /var/lib/lodestar/validators/i1/validator-db```