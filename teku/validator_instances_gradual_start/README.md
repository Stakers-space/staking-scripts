# Spread Teku validartor instances load over longer time to decrease CPU overhead

## Install
- Check the `teku_validatorinstances.sh` script
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/teku/validator_instances_gradual_start/teku_validatorinstances.sh
```
- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/bin/teku_validatorinstances.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/teku/validator_instances_gradual_start/teku_validatorinstances.sh
```
- Modify `validatorInstances_array` and `groupDelay`
```
sudo nano /usr/local/bin/teku_validatorinstances.sh
```
- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/teku_validatorinstances.sh
```

## Use the script
- Start validator instances
```
/usr/local/bin/teku_validatorinstances.sh start
```
- Stop Validator instances
```
/usr/local/bin/teku_validatorinstances.sh stop
```

### Create service that will start instances gradually on server startup
```
sudo nano /etc/systemd/system/start_teku_validator_instances.service
```
Copy the content inside
```
[Unit]
Description=Check time synchronization and setup Mullvad VPN split tunneling if needed

[Service]
Type=oneshot
ExecStart=/usr/local/bin/teku_validatorinstances.sh start

[Install]
WantedBy=multi-user.target
```
- Enable the service on load
```
sudo systemctl enable start_teku_validator_instances.service
```
