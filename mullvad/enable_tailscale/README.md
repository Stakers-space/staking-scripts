# This Utility enables tailscale connection durring active Mullvad connection

## Intro
Most VPN clients blocks other simultaneous VPN connections by default. This utility sets [advanced split tunneling](https://mullvad.net/en/help/split-tunneling-with-linux-advanced) in mullvad for enabled simultaneous Tailscale VPN connection.

[Tailscale](https://tailscale.com/) is a VPN service allowing to create virtual private network. This service is usable for remove connections to any device within created network. The huge benefit is the independence on ISP or router settings.


### How does it work?
Internet traffic go through `nftables` rules. Utilities can add rules to that table to affect behaviour. All nft rules can be listed through command `sudo nft list ruleset`. Within the list:
- Mullvad VPN client manages rule `table inet mullvad` (It's added on connection and removed on disconnection)
- This shell utility manages rule `table inet mullvad-tailscale` (It's added on activation and removed on deactivation)

Mullvad firewall lets through only connections marked with `ct mark 0x00000f41`. Rules of this utility set that mark for Tailscale traffic:
- all connections incoming through `tailscale0` interface (e.g. SSH to the server)
- connections opened by the server to Tailscale IPs listed in `EXCLUDED_IPS`
- DNS queries to the Tailscale resolver

### Connection safety
Losing the Tailscale connection to a remote server is the worst case scenario, so the utility is built to avoid it:
- **Atomic load** – `add-rules` replaces the table in a single kernel transaction. There is no moment without rules, repeated runs do not duplicate rules and if the rules file is invalid, the previously loaded rules stay active.
- **Fixed order of rules** – chains run with priority `-100`, always before Mullvad firewall (priority `0`), no matter which of the tables was loaded later.
- **No removal on service stop** – stopping or restarting the service keeps the rules loaded. Rules are removed only by `remove-rules` action.
- **Self-healing** – rules are loaded again automatically after `nftables.service` restart / reload (it flushes the whole ruleset) and watchdog timer checks every minute that the table is still loaded.
- Established connections keep their mark in conntrack, so an already opened SSH session normally stays alive even while the table is missing. Only new connections are blocked.


## Prerequisities
- Installed Mullvad with active VPN connection
- Installed tailscale
- `nftables` (`nft` command)


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
- Open the file and update `EXCLUDED_IPS` marks
Place there Tailscale IPs of devices the server is going to open connections to. Incoming connections (e.g. SSH from Your HOME PC, Laptop etc.) are allowed for the whole tailnet regardless of the list.
```
sudo nano /usr/local/etc/mullvad-tailscale_netfilters.rules
```

## Usage
- Show help
```
/usr/local/bin/netfilter_manager.sh help
```
- validate the rules file without applying it
```
/usr/local/bin/netfilter_manager.sh check-rules --file "/usr/local/etc/mullvad-tailscale_netfilters.rules"
```
- add rules from `"/usr/local/etc/mullvad-tailscale_netfilters.rules"` file to `nft ruleset` (safe to run repeatedly)
```
/usr/local/bin/netfilter_manager.sh add-rules --file "/usr/local/etc/mullvad-tailscale_netfilters.rules"
```
- add rules only if the table is not loaded
```
/usr/local/bin/netfilter_manager.sh ensure-rules --file "/usr/local/etc/mullvad-tailscale_netfilters.rules"
```
- display loaded `mullvad-tailscale` table (exit code `1`, if it is not loaded)
```
/usr/local/bin/netfilter_manager.sh status
```
- remove `mullvad-tailscale` table from `nft ruleset`
```
/usr/local/bin/netfilter_manager.sh remove-rules --table "mullvad-tailscale"
```
- Display all ruleset marks file
```
/usr/local/bin/netfilter_manager.sh list-rules
```

> [!NOTE]
> Table name is read from the rules file, `--table` option is needed only for removing a table that is not defined in the file. Always load the rules file through `netfilter_manager.sh`. Direct `nft -f` on the file appends the rules to already loaded ones.

> [!WARNING]
> `remove-rules` with connected Mullvad blocks all new Tailscale connections. Do not run it over Tailscale SSH unless you have another access to the server.


## Launch through service file on Ubuntu Server startup
1. Download service files
```
sudo curl -o /etc/systemd/system/mullvad-enable_tailscale.service https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/mullvad/enable_tailscale/mullvad-enable_tailscale.service
```
```
sudo curl -o /etc/systemd/system/mullvad-enable_tailscale-watchdog.service https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/mullvad/enable_tailscale/mullvad-enable_tailscale-watchdog.service
```
```
sudo curl -o /etc/systemd/system/mullvad-enable_tailscale-watchdog.timer https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/mullvad/enable_tailscale/mullvad-enable_tailscale-watchdog.timer
```
2. Edit path to rules file, if needed
```
sudo nano /etc/systemd/system/mullvad-enable_tailscale.service
```
```
sudo nano /etc/systemd/system/mullvad-enable_tailscale-watchdog.service
```
3. Reload daemon-reload
```
sudo systemctl daemon-reload
```
4. Start the service
```
sudo systemctl start mullvad-enable_tailscale.service
```
5. Check the service
```
systemctl status mullvad-enable_tailscale.service
```
```
journalctl -u mullvad-enable_tailscale.service
```
6. Enable service launch on Ubuntu Server startup and the watchdog timer
```
sudo systemctl enable mullvad-enable_tailscale.service
```
```
sudo systemctl enable --now mullvad-enable_tailscale-watchdog.timer
```
7. Check the watchdog
```
systemctl list-timers mullvad-enable_tailscale-watchdog.timer
```
```
journalctl -u mullvad-enable_tailscale-watchdog.service
```
A `[WARN] Table ... is missing, loading rules again...` line in the watchdog log means that something removed the rules and the watchdog loaded them again.


## Safe rollout on a remote server
Process any change (first installation, edit of the rules file, upgrade of the utility) this way, if Tailscale is the only access to the server:
1. Keep the current SSH session opened during the whole process. It survives even a broken ruleset, so it is the way back.
2. Backup the current rules file
```
sudo cp /usr/local/etc/mullvad-tailscale_netfilters.rules /usr/local/etc/mullvad-tailscale_netfilters.rules.bak
```
3. Edit the file and validate it. Nothing is applied in this step.
```
/usr/local/bin/netfilter_manager.sh check-rules
```
4. Apply the rules
```
/usr/local/bin/netfilter_manager.sh add-rules
```
5. Open a **new** SSH session through Tailscale from another terminal. The original session does not prove anything, as it is already established.
6. If the new session cannot be opened, return the backup from the original session and apply it
```
sudo cp /usr/local/etc/mullvad-tailscale_netfilters.rules.bak /usr/local/etc/mullvad-tailscale_netfilters.rules
```
```
/usr/local/bin/netfilter_manager.sh add-rules
```

### Upgrade from the previous version
Previous version used table name `mullvad-tilescale` (typo), chain priority `0` and it appended rules on each run.
1. Download new `netfilter_manager.sh` and service files (see steps above). Old rules file and old service file keep working with the new script.
2. Copy `table inet mullvad-tailscale { ... }` block from the new rules file into your rules file (keep your `EXCLUDED_IPS`), or download the new rules file and set `EXCLUDED_IPS` again.
3. Follow [Safe rollout on a remote server](#safe-rollout-on-a-remote-server). `add-rules` removes the old `mullvad-tilescale` table within the same transaction as it loads the new one.
4. `sudo systemctl daemon-reload` and enable the watchdog timer.

> [!IMPORTANT]
> OS upgrade may restart services that overwrite the netfilter. The watchdog loads the rules again within a minute. If you want to be sure everything is set as after a clean startup, process OS updates with [update-and-restart-linux Utility](https://github.com/Stakers-space/staking-scripts/tree/main/utils/update-and-restart-linux).
