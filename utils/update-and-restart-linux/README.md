# Shell Utility to update and restart Ubuntu Server (or any other linux-based distribution server)

OS update restarts updated services that may results in overwriting custom setups made with the server startup. To configurate them after the OS update, automatical OS restart is beneficial as it's done regardless you are kicked off the SSH acces through the processed OS update or not.

Using this script is necessary e.g. when you have active [Mullvad and Tailscale VPN at teh same time](https://github.com/Stakers-space/staking-scripts/tree/main/mullvad/enable_tailscale)

- Check the `update-and-restart-linux.sh` script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/utils/update-and-restart-linux/update-and-restart-linux.sh
```
- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/bin/update-and-restart-linux.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/utils/update-and-restart-linux/update-and-restart-linux.sh
```
- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/lupdate-and-restart-linux.sh
```
- Use the utility (= process OS update followed by server restart)
```
/usr/local/bin/lupdate-and-restart-linux.sh
```