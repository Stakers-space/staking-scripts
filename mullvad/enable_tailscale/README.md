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


