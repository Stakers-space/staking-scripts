#!/bin/bash
# readme: https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor

# move count trigger for execution here
executor_log_file=""
occurancyKey=$1
serviceName=$2
validatorDataDirectory="/var/lib/lodestar/i1"

declare -r version="1.0.6"

get_version() {
  echo -e "LogMonitor Executor version: $version | Powered by https://stakers.space"
  exit 0
}

log() {
    echo "[$serviceName Logmonitor Executer] $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$executor_log_file"
}

#echo "LogMonitor Executer initialized"

# requests
[ "$1" = "version" ] && get_version && return

if [ -z "$occurancyKey" ]; then
echo "no occurancy key parameter attached: $0 | e.g. 'DBCORRUPTION' from targets_file"
exit 1
fi

if [ -z "$serviceName" ]; then
echo "no service name parameter attached: $1 | e.g. 'lodestarvalidator'"
exit 1
fi

executor_log_file="/tmp/${serviceName}_monitor.log"

case "$occurancyKey" in
    DBCORRUPTION) 
        log "Info | Starting validator instance stop for DBCORRUPTION"
        # Stop the validator instance
        sudo systemctl stop ${serviceName}
        log "Info | Validator instance stopped"
        # remove the directories
        log "Info | Removing directories"
        sudo rm -r ${validatorDataDirectory}/cache
        sudo rm -r ${validatorDataDirectory}/validator-db
        log "Info | Directories removed"
        # wait for at least 2 minutes (slash protection)
        log "Info | Sleeping for 180 seconds"
        sleep 180 # seconds
        # start the validator instance again
        log "Info | Starting validator instance"
        sudo systemctl start ${serviceName}
    # ...
    *)
    log "Warning | Unknown parameter $1"
    exit 1
    ;;
esac