# Shell Utility to start defined services with a certain delay after the OS launch

Starting services with a delay may provide you a certain time between server start and service start. This time may be used to sign-in and alternatively stop the delayed services from starting.
This may come in handy for scripts that may block SSH access, such as [VPN services](https://github.com/Stakers-space/staking-scripts/tree/main/mullvad).

## Install `delayed-start.sh`
- Check the `delayed-start.sh` script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/utils/start_with_delay/delayed-start.sh
```
- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/bin/delayed-start.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/utils/start_with_delay/delayed-start.sh
```
- Define `services` and `delay`
```
sudo nano /usr/local/bin/delayed-start.sh
```
- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/delayed-start.sh
```

## Install `delayed-start.service`
- Check the `delayed-start.service` file
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/utils/start_with_delay/delayed-start.service
```
- Download the script to `/etc/systemd/system` directory
```
sudo curl -o /etc/systemd/system/delayed-start.service https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/utils/start_with_delay/delayed-start.service
```
```
sudo systemctl daemon-reload
```


## Manage the service
- Start the service
```
sudo systemctl start delayed-start.service
```
- Stop the service
```
sudo systemctl start delayed-start.service
```
- Check the service
```
sudo systemctl status delayed-start.service
```
- Enable auto start on OS launch
```
sudo systemctl enable delayed-start.service
```
- Disable auto start on OS launch
```
sudo systemctl disable delayed-start.service
```