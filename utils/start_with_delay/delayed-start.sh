#!/bin/bash
# Launch defined services

### VPN service (remove # to activate the command)
# mullvad connect

### StakersSpace configuration (remove # to activate the command)
# /usr/local/bin/staking.sh start execution
# /usr/local/bin/staking.sh start beacon
# sleep 30
# /usr/local/bin/staking.sh start validators

### Standard configuration (remove # to activate the command)
# systemctl start nethermind.service
# systemctl start lodestar-beacon.service
# systemctl start lodestar-vi1.service
# ...

# other sevices ...
# ...
# ..._logmonitor
# ...