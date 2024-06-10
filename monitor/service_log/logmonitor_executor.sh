#!/bin/bash
# readme: https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor

# move count trigger for execution here
executor_log_file="${0}.log"
occurancyKey=$1
serviceName=$2

declare -r version="1.0.4"

get_version() {
  echo -e "LogMonitor Executor version: $version | Powered by https://stakers.space"
  exit 0
}

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$log_file"
}

echo "LogMonitor Executer initialized"

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
        if [ ! -f "/usr/local/bin/mullvad_change_server.sh" ]; then
            log "[Warn] /usr/local/bin/mullvad_change_server.sh not found"
            exit 1
        else
            log "Changing mullvad VPN relay server"
            #/usr/local/bin/mullvad_change_server.sh
        fi
        ;;
    CLIENT) 
        log "logmonitor_executor | Executing $occurancyKey | Service: $serviceName"
        # sudo systemct restart $serviceName
        ;;
    NOLOG)
        log "logmonitor_executor | Executing $occurancyKey | Service: $serviceName"
        # sudo systemct restart $serviceName
        ;;
    # ...
    *)
    log "Warning | Unknown parameter $1"
    exit 1
    ;;
esac