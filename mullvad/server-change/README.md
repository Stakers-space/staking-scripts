# Utility shell to change connection to different Mullvad VPN server

## Intro
Once Mullvad is installed and configured, it establishes a secure connection to a VPN server. It's a mediator active between your staking node and its connected peers. The advantage is that peers see the IP address of the Mullvad VPN server instead of yours, which add a certain layer of security. However it also introduces a network intermediary with many potential points of failure.

## Prerequisites / Dependencies
Installed Mullvad VPN client on the Ubuntu Server

## Shell script Installation
From a home directory
```
cd ~
```

1. Download the script
```
curl -o https://raw.githubusercontent.com/Stakers-space/ShellScripts/main/mullvad/server-change/mullvad_change_server.sh
```

2. Open and check the downloaded script
```
nano ~/mullvad_change_server.sh
```

3. Edit `RELAY_LOCATIONS` configuration in opened script
Within the opened shell script `mullvad_change_server.sh`, find array `RELAY_LOCATIONS`, see below:
```
# List with preferred VPN server locations
RELAY_LOCATIONS=("cz prg" "de fra" "de ber" "de dus" "at vie" "pl waw" "sk bts")
```
Replace its content `"cz prg" "de fra" "de ber" "de dus" "at vie" "pl waw" "sk bts"` for your preferred geo location (nearest to your node) from [https://mullvad.net/en/servers](https://mullvad.net/en/servers).

4. Move the script to `/usr/local/bin` directory
```
sudo mv ~/mullvad_change_server.sh /usr/local/bin
```

4. Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/mullvad_change_server.sh
```

5. From scripts and services, within which you detect an issue with a internet connection, process the file
```
/usr/local/bin/mullvad_change_server.sh
```
NOTE: Do not forget to set necessary permissions.