# Utility shell for Mullvad VPN management

## Intro
Once Mullvad is installed and configured, it establishes a secure connection to a VPN server. It's a mediator active between your staking node and its connected peers. The advantage is that peers see the IP address of the Mullvad VPN server instead of yours, which add a certain layer of security. However it also introduces a network intermediary with many potential points of failure. Utilities on this page can be used to mitigate these issues.

### [Change Mullvad VPN server utility](./server-change/README.md)
Shell Script utility that may be used by other scripts to join a VPN servers from predefined selection of VPN servers based on GEO locations.
- [mullvad_server_change.sh](https://github.com/Stakers-space/ShellScripts/tree/main/mullvad/server-change)


### [Prevent issue with time synchronization due to VPN](./split-tunnel/README.md)
System utility that automatically checks `timedatectl status` every 30 minutes and adding `split tunnel`, if necessary.
- [mullvad_split_tunnel_set.sh](https://github.com/Stakers-space/ShellScripts/tree/main/mullvad/split-tunnel)