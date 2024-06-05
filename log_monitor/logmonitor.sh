#!/bin/bash
# readme: https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor

service_name=""
targets_file=""
log_maxwaitingtime=1000 #if no new log is received within the time, it may indicate that the service is stucked / does not listen / respond
executer_shell="" #logmonitor_executer.sh
executer_trigger_count=200
executer_trigger_periode=600
executer_trigger_pause=900
declare -r version="1.0.1"

get_version() {
  echo -e "LogMonitor version: $version | Powered by https://stakers.space"
}

get_help() {
    echo "https://github.com/Stakers-space/staking-scripts/tree/main/log_monitor"
}

# Set variables from attached parameters
use_shell_parameters() {
    TEMP=$(getopt -o s:tf:lt:ex:etc:ett:etd: --long service_name:,targets_file:,log_maxwaitingtime:,executer_shell:,executer_trigger_count:,executer_trigger_periode:,executer_trigger_pause: -- "$@")
    eval set -- "$TEMP"

    # requests
    [ "$1" = "version" ] && get_version && return
    [ "$1" = "help" ] && get_help && return

    # params
    while true; do
        case "$1" in
              -s|--service_name) service_name="$2" shift 2 ;;
             -tf|--targets_file) targets_file="$2" shift 2 ;; # optioal in log_maxwaitingtime mode
             -lt|--log_maxwaitingtime) log_maxwaitingtime="$2" shift 2 ;;
             -ex|--executer_shell) executer_shell="$2" shift 2 ;;
            -etc|--executer_trigger_count) executer_trigger_count="$2" shift 2 ;;
            -ett|--executer_trigger_periode) executer_trigger_periode="$2" shift 2 ;;
            -etd|--executer_trigger_pause) executer_trigger_pause="$2" shift 2 ;;
            --) shift
                break
                ;;
            *)
                echo "Warning | Unknown parameter $2"
                exit 1
                ;;
        esac
    done
}

init_config() {
    # override values with values from params, if attached
    if [ $# -gt 0 ]; then
        use_shell_parameters "$@"
    else
        echo "No parameters attached"
        exit 1
    fi

    echo "Log Monitor configuration"
    echo "├── service_name:       $service_name | this service log is being tracked"
    echo "├── targets_file:       $targets_file [file] list of occurrences for which the log is checked"
    echo "├── log_maxwaitingtime: $log_maxwaitingtime [seconds] Maximum enabled time between 2 printed logs by the tracked service"
    echo "└── executer_shell:     $execution_shell shell executing actions once the trigger is reached [if no filled, no action is applied]"
    echo "    ├── trigger:   $executer_trigger_count [int] required number of occurances to execute a given action"
    echo "    ├── periode:   $executer_trigger_periode [seconds] | interval in which @trigger is automatically reseted to 0"
    echo "    └── delay:     $executer_trigger_pause [seconds] | delay time after execution- time for servicrs estabilishment before continuing in the script"
    
}
init_config

declare -A tracked_occurances_arr # from $targets_file file
load_tracking_targets (){
    if [ ! -f "$targets_file" ]; then
        echo "$targets_file not found / accessible."
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
load_tracking_targets

execution_processor=0
load_execution_processor() {
    if [ ! -f "$executer_shell" ]; then
        echo "[Warn] $executer_shell not found / defined - running log monitor without execution processor"
    else
        execution_processor=1
    fi
}
load_execution_processor


##########
## Monitor
last_reset=$(date +%s)
# infinite loop - monitoring is repetitive activity
while true; do
    journalctl -fu $service_name | while read -r line; do
        current_time=$(date +%s)

        if [ "$execution_processor" -eq 1 ]; then
            # Reset intervals after $executer_trigger_periode
            if (( current_time - last_reset > executer_trigger_periode )); then
                for occKey in "${!occ_counts_arr[@]}"; do
                    occ_counts_arr["$occKey"]=0
                done
                echo "$service_name log monitor | Occurancies counts reseted to 0"
                last_reset=$current_time
            fi
        fi

        if [ "$log_maxwaitingtime" -gt 0 ]; then
            # reset / remove previous timer (through different shell with sleep timer - trap - SIGINT)
            
            # set new timer (sleep with certain action afterward)

            local timeSincePreviousLog=$((current_time - previous_log_time))
            if (( timeSincePreviousLog > log_maxwaitingtime )); then
                echo "$service_name log monitor | no new log received in "
                if [ "$execution_processor" -eq 1 ]; then
                    # Execute action
                    "$executer_shell" "nolog" "$service_name"
                fi
            fi
            previous_log_time=$current_time
        fi
        
        # iterate over realtime log and check it for tracked_occurances_arr states
        #$ {!tracked_occurances_arr[@]} returns list of all keys
        for occKey in "${!tracked_occurances_arr[@]}"; do
            # tracked string found in the service log
            if [[ "$line" == *"${tracked_occurances_arr[$occKey]}"* ]]; then
                # increase numer of counts for detected error
                ((occ_counts_arr["$occKey"]++))
                
                echo "!!! $tracked_occurances_arr[$occKey] detected | hits counter: $occKey hits $occ_counts_arr["$occKey"] in last $executer_trigger_periode seconds"
                
                if [ "$execution_processor" -ne 1 ]; then
                    return
                fi

                # Execution processor
                # Process action if occurancy count is higher than $executer_trigger_count
                if [[ ${occ_counts_arr["$occKey"]} -ge $executer_trigger_count ]]; then
                    echo "$service_name log monitor | $current_time || $occKey | count: $occ_counts_arr["$occKey"]"

                    # Execute action
                    "$executer_shell" "$occKey" "$service_name"

                    # Reset occurancy counters back to 0
                    occ_counts_arr["$occKey"]=0

                    echo "$service_name log monitor  | Paused for $executer_trigger_pause seconds"
                    sleep $executer_trigger_pause
                fi
            fi
        done
    done
done