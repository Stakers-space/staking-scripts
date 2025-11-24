#!/bin/bash
# readme: https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor

set -euo pipefail

# move count trigger for execution here
executor_log_file=""
occurancyKey=$1
serviceName=$2
# optional parameters
executionServiceName=$3
beaconServiceName=$4

declare -r version="1.1.0"

get_version() {
  echo -e "LogMonitor Executor version: $version | Powered by https://stakers.space"
  exit 0
}

log() {
    echo "[$serviceName Logmonitor Executor] $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$executor_log_file"
}

#echo "LogMonitor Executor initialized"

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

executor_log_file="/tmp/${serviceName}_monitor.log"

restart_execution() {
    if [ -n "$executionServiceName" ]; then
        sudo --non-interactive systemctl restart "$executionServiceName"
    else
        log "[Warn] executionServiceName is not defined"
    fi
}

restart_beacon() {
    if [ -n "$beaconServiceName" ]; then
        sudo --non-interactive systemctl restart "$beaconServiceName"
    else
        log "[Warn] beaconServiceName is not defined"
    fi
}

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
        sudo --non-interactive systemctl restart $serviceName
        ;;
    EXECUTION)
        log "logmonitor_executor | Executing $occurancyKey | Service: $serviceName"
        restart_execution
        ;;
    BEACON)
        log "logmonitor_executor | Executing $occurancyKey | Service: $serviceName"
        restart_beacon
        ;;
    EXECUTION_CONSENSUS)
        log "logmonitor_executor | Executing $occurancyKey | Service: $serviceName"
        restart_execution
        restart_beacon
        ;;
    NOLOG)
        log "logmonitor_executor | Executing $occurancyKey | Service: $serviceName"
        sudo --non-interactive systemctl restart "$serviceName"
        ;;
    STOPSTART)
        log "logmonitor_executor | Executing $occurancyKey | Service: $serviceName"
        sudo --non-interactive systemctl stop "$serviceName"
        sudo --non-interactive systemctl start "$serviceName"
        ;;
    # ...
    *)
    log "Warning | Unknown parameter $1"
    exit 1
    ;;
esac