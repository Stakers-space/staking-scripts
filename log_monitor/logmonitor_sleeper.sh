#!/bin/bash
# readme: https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor

# Separated execution shell script. It serves as a timedown timer. If not cancelled before reaching trigger time, it triggers client restart
# (although it may also forward to executor) either directly or through ./staking.sh

occurancyKey=$1
service_name=$2
log_maxwaitingtime=$3
#executor_shell=$4 # keep execution separated from executor (= keep the script executor indepent)

declare -r version="1.0.1"

get_version() {
  echo -e "LogMonitor version: $version | Powered by https://stakers.space"
  exit 0
}

# requests
[ "$1" = "version" ] && get_version && return

if [ -z "$occurancyKey" ]; then
echo "no occurancy key parameter attached: $1 | e.g. 'NETWORK' from targets_file"
exit 1
fi

if [ -z "$service_name" ]; then
echo "no service name parameter attached: $2 | e.g. 'lodestarbeacon'"
exit 1
fi

if [ -z "$log_maxwaitingtime" ]; then
echo "no ssleep time parameter attached: $3 | e.g. 500 [seconds]"
exit 1
fi

timedown_trigger() {
    echo "Trigger timer reached for 1- $1 2- $2 3- $3"
    #if [ -n "$executor_shell" ]; then
    #    "$executor_shell" "$occurancyKey" "$service_name"
    #else
        echo "Executing $service_name restart | sudo systemctl restart $2"
    #fi
}

# run timer on background
sleep $log_maxwaitingtime &  
timer_pid=$!  # save PID

# Process signal for stopping timer
trap "kill $timer_pid 2> /dev/null; echo 'Timer cancelled.';" SIGINT

wait $timer_pid
timedown_trigger "$occurancyKey" "$service_name" "$log_maxwaitingtime"

# Reset trap
trap - SIGINT