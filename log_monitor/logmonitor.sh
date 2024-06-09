#!/bin/bash
# readme: https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor

service_name=""
targets_file=""
log_maxwaitingtime=1000 #if no new log is received within the time, it may indicate that the service is stucked / does not listen / respond
executor_shell="" #logmonitor_executor.sh
executor_trigger_count=200
executor_trigger_periode=600
executor_trigger_pause=1200
declare -r version="1.0.2"

lastLogTimeFile=""
paused=0 # paused monitoring
#(sleep 120; paused=0) &

print_variables() {
    echo "Log Monitor configuration"
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
        echo "Params after eval set: $1 $2"
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

declare -A tracked_occurances_arr # from $targets_file file
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
    done < "$targets_file"
}

execution_processor=0
load_execution_processor() {
    if [ ! -f "$executor_shell" ]; then
        echo "[Warn] load_execution_processor: $executor_shell not found / defined - running log monitor without execution processor"
        exit 1
    else
        execution_processor=1
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
}
init_config "$@"
 # override values with values from params, if attached
use_shell_parameters "$@"
# load other data
load_tracking_targets
load_execution_processor
print_variables

##########
safe_service_name=$(echo "$service_name" | tr -d '[:space:]/\\')
lastLogTimeFile="/tmp/${safe_service_name}_last_log_time.txt"
save_lastLogTime() {
    echo "Saving last log time $1"
    if ! echo "$current_time" > "$lastLogTimeFile"; then
        echo "Error: Failed to write to $lastLogTimeFile"
    else
        last_log_time=$1
    fi
}

## Monitor
if ! systemctl is-active --quiet "$service_name"; then
    echo "Service $service_name is not active."
    exit 1
fi



last_log_time=$(date +%s)
if [ "$log_maxwaitingtime" -gt 0 ]; then
    save_lastLogTime $(date +%s)

    while true; do
        current_time=$(date +%s)
        last_log_time=$(cat $lastLogTimeFile)
        echo "!!! [CLIENT] Stucked log check | Last log Time: $last_log_time | Now: $current_time || Time from last log: $((current_time - last_log_time)) seconds | Max meantime: $log_maxwaitingtime"
        if (( current_time - last_log_time > log_maxwaitingtime )); then
            echo "!!! No log occured in $((current_time - last_log_time)) seconds"
            if [ "$execution_processor" -eq 1 ]; then
                # restart client
                "$executor_shell" "NOLOG" "$service_name"
            fi
            # pause after restart
            sleep 100
        fi
        # run in $log_maxwaitingtime interval
        sleep $log_maxwaitingtime
    done &
fi

last_reset=$(date +%s)
# On each new line
journalctl -fu $service_name | while read -r line; do
    current_time=$(date +%s)
    # echo "$service_name LogMonitor | $current_time | new line $line"

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

    # process once per 30 seconds to reduce disk IOs
    if (( current_time - last_log_time > 30 )); then
        save_lastLogTime $current_time
        last_log_time=$current_time
    fi

    # iterate over realtime log and check it for tracked_occurances_arr states
    #$ {!tracked_occurances_arr[@]} returns list of all keys
    for occKey in "${!tracked_occurances_arr[@]}"; do
        # tracked string found in the service log
        if [[ "$line" == *"${tracked_occurances_arr[$occKey]}"* ]]; then
            # increase numer of counts for detected error
            ((occ_counts_arr["$occKey"]++))
                
            echo "!!! $tracked_occurances_arr[$occKey] detected | hits counter: ${occ_counts_arr["$occKey"]} in last $executor_trigger_periode seconds"
                
            if [ "$execution_processor" -ne 1 ]; then
                return
            fi

            # Execution processor
                # If this would be move into executor, there's possible to set individual trigger count for any error separately (special trigger config file)
                    # Isssue with the sleep for certain time after execution (not known the execution time - although it may be held in execution script as well)
            # Process action if occurancy count is higher than $executor_trigger_count
            if [[ ${occ_counts_arr["$occKey"]} -ge $executor_trigger_count ]]; then
                echo "$service_name log monitor | $current_time || $occKey | count: ${occ_counts_arr["$occKey"]}"

                # Execute action
                "$executor_shell" "$occKey" "$service_name"

                # Reset occurancy counters back to 0
                occ_counts_arr["$occKey"]=0

                echo "$service_name log monitor | Pause for $executor_trigger_pause seconds"
                paused=1
                sleep $executor_trigger_pause
                paused=0
                echo "$service_name log monitor | Unpaused after $executor_trigger_pause seconds"
            fi
        fi
    done
done