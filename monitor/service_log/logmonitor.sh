#!/bin/bash
# readme: https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor

service_name=""
targets_file=""
log_maxwaitingtime=1000 #if no new log is received within the time, it may indicate that the service is stucked / does not listen / respond
executor_shell="" #logmonitor_executor.sh
executor_trigger_count=200
executor_trigger_periode=600
executor_trigger_pause=1200
# add log file (inside /var/lib... service data addressory)
#peers_regex=" - peers: ([0-9]+)"
#min_peers=20

declare -r version="1.0.4"

# System variables (do not modify)
lastLogTimeFile=""
# frequency of updating data in the file
readonly lastlogfile_updateTimer=60
declare -A tracked_occurances_arr # from $targets_file file
declare -a tracked_occurances_keys # keys from tracked_occurances_arr
execution_processor=0

print_variables() {
 echo -e "\nLog Monitor configuration"
    echo "├── service_name:       $service_name | this service log is being tracked"
    echo "├── targets_file:       $targets_file [file] list of occurrences for which the log is checked"
    echo "├── log_maxwaitingtime: $log_maxwaitingtime [seconds] Maximum enabled time between 2 printed logs by the tracked service"
    echo "└── executor_shell:     $executor_shell shell executing actions once the trigger is reached [if no filled, no action is applied]"
    echo "    ├── trigger:   $executor_trigger_count [int] required number of occurances to execute a given action"
    echo "    ├── periode:   $executor_trigger_periode [seconds] | interval in which @trigger is automatically reseted to 0"
    echo "    └── delay:     $executor_trigger_pause [seconds] | delay time after execution- time for servicrs estabilishment before continuing in the script"
}

get_version() {
    echo -e "LogMonitor version: $version | Powered by https://stakers.space"
    exit 0
}

get_help() {
    echo "https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor"
    print_variables
    exit 0
}

# Set variables from attached parameters
use_shell_parameters() {
    TEMP=$(getopt -o s:f:t:x:c:d:p: --long service_name:,targets_file:,log_maxwaitingtime:,executor_shell:,executor_trigger_count:,executor_trigger_periode:,executor_trigger_pause: -- "$@")
    #echo "TEMP before eval: $TEMP"
    eval set -- "$TEMP"
    
    # params
    while true; do
        #echo "Params after eval set: $1 $2"
        case "$1" in
            -s|--service_name) 
                service_name="$2" 
                shift 2 
                if [ -z "$service_name" ]; then
                    echo "Error: No service name specified."
                    exit 1
                fi
                ;;
            -f|--targets_file) 
                targets_file="$2" 
                shift 2
                if [ -z "$targets_file" ]; then
                    echo "Error: No target file specified."
                    exit 1
                fi
                ;;
            -t|--log_maxwaitingtime) 
                log_maxwaitingtime="$2"
                shift 2
                ;;
            -x|--executor_shell) 
                executor_shell="$2" 
                shift 2
                ;;
            -c|--executor_trigger_count) 
                executor_trigger_count="$2" 
                shift 2
                ;;
            -d|--executor_trigger_periode) 
                executor_trigger_periode="$2" 
                shift 2
                ;;
            -p|--executor_trigger_pause) 
                executor_trigger_pause="$2" 
                shift 2
                ;;
            --) shift
                break
                ;;
            *)
                echo "Warning | Unknown parameter $2 | all parameters $@"
                exit 1
                ;;
        esac
    done
}

# fill $tracked_occurances_arr and $tracked_occurances_keys based on $targets_file
load_tracking_targets (){
    if [ ! -f "$targets_file" ]; then
        echo "load_tracking_targets: $targets_file not found / accessible. Target File parameter is required!"
        exit 1
    fi

    echo "Tracking for following actions"
    #parse by lines
    while IFS= read -r line; do
        # split according to first occurancy of ':'
        # parseby :   leftSide  rightSide
        IFS=@ read -r occKey occString <<< "$line"
        # each line must contain at least 1x : [type]:[string]
        if [[ -z "$occKey" || -z "$occString" ]]; then
            echo "[Error] Line $line does not fill valid schema 'occurancyKey@occurancyString'"
            exit 1
        fi

        echo "# $occKey @ $occString"
        tracked_occurances_arr["$occKey"]="$occString"
        tracked_occurances_keys+=("$occKey")
    done < "$targets_file"

    if [ ${#tracked_occurances_keys[@]} -eq 0 ]; then
        echo "$targets_file has no lines. Searching in log is disabled."
    fi
}

load_execution_processor() {
    if [ ! -f "$executor_shell" ]; then
        echo "[Warn] load_execution_processor: $executor_shell not found / defined - running log monitor without execution processor"
        exit 1
    else
        execution_processor=1
        local executor_log_file="/tmp/${service_name}_monitor.log"
        # Create Log file
        if [ ! -f "$executor_log_file" ]; then
            echo "[$service_name CLIENT] Creating $executor_log_file"
            touch "$executor_log_file"
        fi
    fi
}

init_config() {
    if [ $# -eq 0 ]; then
        echo "No parameters attached. See 'help' for more info"
        print_variables
        exit 1
    else
        [ "$1" = "version" ] && get_version && return
        [ "$1" = "help" ] && get_help && return
    fi

    # override values with values from params, if attached
    use_shell_parameters "$@"
    # load other data
    load_tracking_targets
    load_execution_processor
    print_variables
}
init_config "$@"


cleanup() {
    echo "Exiting script function"
    exit 0 
}

# (Ctrl+C)
trap cleanup SIGINT


########################################################
## Monitor
if ! systemctl is-active --quiet "$service_name"; then
    echo "Service $service_name is not active."
    exit 1
fi

safe_service_name=$(echo "$service_name" | tr -d '[:space:]/\\')
lastLogTimeFile="/tmp/${safe_service_name}_log_lt.txt"
last_log_time=$(date +%s)
push_lastLogTimeToFile() {
    local time_to_save=$1
    if ! echo "$current_time" > "$lastLogTimeFile"; then
        echo "!!![$service_name CLIENT] Error: Failed to write to $lastLogTimeFile"
    else
        echo "[$service_name CLIENT] time $time_to_save succesfuly saved in $lastLogTimeFile"
        last_log_time=$time_to_save
        #if [ -s "$last_log_time" ]; then
        #    echo "Last log time is $(cat "$lastLogTimeFile")"
        #else
        #    echo "Error: Log time file is empty."
        #    last_log_time=$(date +%s)
        #fi  
    fi
}

# UTILITY: check for stucked client (no logs for defined time)
current_time=$(date +%s)
push_lastLogTimeToFile $current_time

process_last_log_time_check() {
    while true; do
        local current_ftime=$(date +%s)
        local last_ftime=$(cat $lastLogTimeFile)
        local timeFromLastLog=$((current_ftime - last_ftime))
        echo "[$service_name CLIENT] LL $last_log_time | Time since last log: $timeFromLastLog/$log_maxwaitingtime"
        if (( $timeFromLastLog > log_maxwaitingtime )); then
            echo "!!! [$service_name CLIENT] No log occured in $timeFromLastLog seconds"
            if [ "$execution_processor" -eq 1 ]; then
                # execute action
                "$executor_shell" "NOLOG" "$service_name"
                # pause after restart
                sleep 100
            fi
        fi
        sleep $log_maxwaitingtime
    done &
}

if [ "$log_maxwaitingtime" -gt 0 ]; then
    process_last_log_time_check
fi

# UTILITY: Check each new log line for defined string
last_reset=$(date +%s)
# On each new line
journalctl -fu $service_name | while read -r line; do
    current_time=$(date +%s)
    # echo "$service_name LogMonitor | $current_time | new line $line"
    echo "$service_name | new log | seconds from last: $((current_time - last_log_time))"

    # process once per 30 seconds to reduce disk IOs
    if (( current_time - last_log_time > $lastlogfile_updateTimer )); then
        push_lastLogTimeToFile $current_time
    fi

    # if there are no defined lines → return (there's no defined pattern(s) to find)
    if [ ${#tracked_occurances_keys[@]} -eq 0 ]; then
        break
    fi

    if [ "$execution_processor" -eq 1 ]; then
        # Reset intervals after $executor_trigger_periode
        if (( current_time - last_reset > executor_trigger_periode )); then
            for occKey in "${!occ_counts_arr[@]}"; do
                occ_counts_arr["$occKey"]=0
            done
            echo "$service_name log monitor | Occurancies counts reseted to 0"
            last_reset=$current_time
        fi
    fi

    # iterate over realtime log and check it for tracked_occurances_arr states
    #$ {!tracked_occurances_arr[@]} returns list of all keys
    for occKey in "${tracked_occurances_keys[@]}"; do
        # tracked string found in the service log
        if [[ "$line" == *"${tracked_occurances_arr[$occKey]}"* ]]; then
            
            #  peers check
            #if [[ $line =~ $peers_regex ]]; then
            #    peers=${BASH_REMATCH[1]}
            #    echo "Active peers: $peers (minimum: $min_peers)"
            #    if [[ $peers -gt $min_peers ]]; then
            #       break
            #    fi
            #fi
            
            # increase numer of counts for detected error
            ((occ_counts_arr["$occKey"]++))
                
            echo "!!![$service_name] $occKey @ ${tracked_occurances_arr["$occKey"]} | ${occ_counts_arr["$occKey"]}/$executor_trigger_count hits in ${executor_trigger_periode}s"
                
            if [ "$execution_processor" -ne 1 ]; then
                break
            fi

            # Execution processor
                # If this would be moved into executor, there's possible to set individual trigger count for any error separately (special trigger config file)
                    # Isssue with the sleep for certain time after execution (not known the execution time - although it may be held in execution script as well)
            # Process action if occurancy count is higher than $executor_trigger_count
            if [[ ${occ_counts_arr["$occKey"]} -ge $executor_trigger_count ]]; then
                
                echo "$service_name pattern detection | $current_time || $occKey | count: ${occ_counts_arr["$occKey"]}"

                # Execute action
                "$executor_shell" "$occKey" "$service_name"

                # Reset occurancy counters back to 0
                occ_counts_arr["$occKey"]=0

                echo "$service_name log monitor | Pause for $executor_trigger_pause seconds"
                # pause also last log time monitor (substream)
                push_lastLogTimeToFile $((current_time + executor_trigger_pause))
                # pause the script
                sleep $executor_trigger_pause
            fi
        fi
    done
done