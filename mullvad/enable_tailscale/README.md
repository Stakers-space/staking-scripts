# This Utility enables tailscale connection durring active Mullvad connection

## Intro
Most VPN clients blocks other simultaneous VPN connections by default. This utility sets [advanced split tunneling](https://mullvad.net/en/help/split-tunneling-with-linux-advanced) in mullvad for enabled simultaneous Tailscale VPN connection.

[Tailscale](https://tailscale.com/) is a VPN service allowing to create virtual private network. This service is usable for remove connections to any device within created network. The huge benefit is the independence on ISP or router settings.


### How does it work?
Internet traffic is go through a netfilter list. Utilities then customize the traffic through a rules in the nft. All nft rules can be listed through command `sudo nft list ruleset`. Within the list:
- Mullvad VPN client manages rule `table inet mullvad` (It's added on connection and removed on disconnection)
- This shell utility manages rule `table inet mullvad-tailscale` (It's added on activation and removed on deactivation)


## Prerequisities
- Installed Mullvad with active VPN connection
- Installed tailscale


# Installation
1. Download `netfilter_manager.sh` shell script
- View the file
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/mullvad/enable_tailscale/netfilter_manager.sh
```
- download the service file to `/usr/local/bin` directory
```
sudo curl -o /usr/local/bin/netfilter_manager.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/mullvad/enable_tailscale/netfilter_manager.sh
```
- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/netfilter_manager.sh
```

2. Download `tailscale_netfilters.rules` file
- View the file
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/mullvad/enable_tailscale/mullvad-tailscale_netfilters.rules
```
- download the service file to `/usr/local/etc` directory
```
sudo curl -o /usr/local/etc/mullvad-tailscale_netfilters.rules https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/mullvad/enable_tailscale/mullvad-tailscale_netfilters.rules
```
- Open the file and update `EXCLUDED_IPS` marks for your server Tilescale IP(s)
```
sudo nano /usr/local/etc/mullvad-tailscale_netfilters.rules
```

## Usage
- Show help
```
/usr/local/bin/netfilter_manager.sh help
```
- add rules from `"/usr/local/etc/mullvad-tailscale_netfilters.rules"` file to `nft ruleset`
```
/usr/local/bin/netfilter_manager.sh add-rules "/usr/local/etc/mullvad-tailscale_netfilters.rules"
```
- remove `mullvad-tailscale` mark from `nft ruleset`
```
/usr/local/bin/netfilter_manager.sh remove-rules "mullvad-tilescale"
```
- Display all ruleset marks file
```
/usr/local/bin/netfilter_manager.sh list-rules
```


## Launch through service file on Ubuntu Server startup
1. Download service file
```
sudo curl -o /etc/systemd/system/mullvad_enable_tailscale.service https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/mullvad/enable_tailscale/mullvad_enable_tailscale.service
```
2. Edit path to rules file, if needed
```
sudo nano /etc/systemd/system/mullvad_enable_tailscale.service
```
3. Enable service launch on Ubuntu Server startup
```
sudo systemctl enable /etc/systemd/system/mullvad_enable_tailscale.service
```
4. Start the service
```
sudo systemctl start /etc/systemd/system/mullvad_enable_tailscale.service
```
5. Check the service
```
systemctl status /etc/systemd/system/mullvad_enable_tailscale.service
```