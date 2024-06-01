#!/bin/bash
# readme: https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor

occurancyKey=$1
serviceName=$2
sleepTime=$3

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
    echo "Timer reached for $1 $2 $3"
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