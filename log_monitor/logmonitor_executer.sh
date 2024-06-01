#!/bin/bash
# readme: https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor

occurancyKey=$1
serviceName=$2
if [ -z "$occurancyKey" ]; then
echo "no occurancy key parameter attached: $0 | e.g. 'NETWORK' from targets_file"
exit 1
fi

if [ -z "$serviceName" ]; then
echo "no service name parameter attached: $1 | e.g. 'lodestarbeacon'"
exit 1
fi

case "$occurancyKey" in
    NETWORK) 
        # /usr/local/bin/mullvad_change_server.sh
        ;;
    CLIENT)
        #    sudo systemct restart $service
        ;;
    # ...
    *)
    echo "Warning | Unknown parameter $1"
    exit 1
    ;;
esac
