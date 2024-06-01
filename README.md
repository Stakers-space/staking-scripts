# Shell script utilities for stakers

## Intro
A collection of utility scripts that may be handy to have on a staking machine. Written right in the shell, no external library required.

Click at selected client / tool for related options

## Execution clients
- [Nethermind](./nethermind) - Utilities for Nethermind client
- [Erigon](./erigon) - Utilities for Erigon client
- [Geth](./geth) - Utilities for Geth client

## Consensus clients
- [Lighthouse](./lighthouse) - Utilities for Lighthouse client
- [Lodestar](./lodestar) - Utilities for Lodestar client
- [Teku](./geth) - Utilities for Teku client

## Related utils
- [Mullvad VPN](./mullvad/README.md) - Utilities for Mullvad VPN client
- [EthDo](./ethdo) - Utilities for EthDo client
- [Staking Manager](./manager) - Staking manager


### Development roadmap
- Move logmonitor.sh into separated github section ¨log_monitor¨
  - Define fixed tracking keys [network, client, cpu, ...]
  - Link at it from client pages (contains usage of the script, tracked string files, service files)
- manager/staking.sh
  - testing - switching from debug to first production release
