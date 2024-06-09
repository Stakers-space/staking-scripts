#!/bin/bash
# readme: https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor

# move count trigger for execution here

occurancyKey=$1
serviceName=$2

declare -r version="1.0.1"

get_version() {
  echo -e "LogMonitor version: $version | Powered by https://stakers.space"
}

# requests
[ "$1" = "version" ] && get_version && return

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
        echo "logmonitor_executor | Executing $occurancyKey"
        ;;
    CLIENT)
        #    sudo systemct restart $service
        echo "logmonitor_executor | Executing $occurancyKey"
        ;;
    # ...
    *)
    echo "Warning | Unknown parameter $1"
    exit 1
    ;;
esac