#!/bin/bash
# readme: https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor

# Separated execution shell script. It serves as a timedown timer. If not cancelled before reaching trigger time, it triggers client restart
# (although it may also forward to executor) either directly or through ./staking.sh


occurancyKey=$1
serviceName=$2
sleepTime=$3

declare -r version="1.0.1"

get_version() {
  echo -e "LogMonitor version: $version | Powered by https://stakers.space"
}

# requests
[ "$1" = "version" ] && get_version && return

if [ -z "$occurancyKey" ]; then
echo "no occurancy key parameter attached: $1 | e.g. 'NETWORK' from targets_file"
exit 1
fi

if [ -z "$serviceName" ]; then
echo "no service name parameter attached: $2 | e.g. 'lodestarbeacon'"
exit 1
fi

if [ -z "$sleepTime" ]; then
echo "no ssleep time parameter attached: $3 | e.g. 500 [seconds]"
exit 1
fi

timedown_trigger() {
    echo "Timer reached for $1 $2 $3 | ServiceName: $serviceName"
    # restart the service
    # sudo systemctl restart $serviceName
    # or through executor ?
}

# run timer on background
sleep $sleepTime &  
timer_pid=$!  # save PID

# Process signal for stopping timer
trap "kill $timer_pid 2> /dev/null; echo 'Timer cancelled.';" SIGINT

wait $timer_pid
timedown_trigger "$occurancyKey" "$serviceName" "$sleepTime"

# Reset trap
trap - SIGINT