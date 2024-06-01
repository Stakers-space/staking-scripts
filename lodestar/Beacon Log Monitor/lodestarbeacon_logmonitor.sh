#!/bin/bash
# readme: https://github.com/Stakers-space/staking-scripts/tree/main/lodestar/Beacon%20Log%20Monitor

service="lodestarbeacon.service"
tracking_definition_file="/usr/local/etc/lodestar_tracking_records.txt"
tracking_match_triggercount=200
tracking_periode=600
tracking_pause=900
manager_config_filesDir="/usr/local/etc/staking/config"

parse_args() {
    TEMP=$(getopt -o s:e:m:t:p: --long service:,definition_file:,triggercount:,tracking_periode:,tracking_pause: -- "$@")
    eval set -- "$TEMP"

    echo "logmonitor.conf launch parameters attached"

    while true; do
        case "$1" in
            -s|--service)
                echo "├── Switching serviceName:      $service → $2"
                service="$2"
                shift 2
                ;;
            -df|--definition_file)
                echo "├── Switching target file:      $tracking_definition_file → $2"
                tracking_definition_file="$2"
                shift 2
                ;;
            -tc|--triggercount)
                echo "├── Switching tigger count:     $tracking_match_triggercount → $2"
                tracking_match_triggercount="$2"
                shift 2
                ;;
            -tp|--tracking_periode)
                echo "├── Switching tracking periode: $tracking_periode → $2"
                tracking_periode="$2"
                shift 2
                ;;
            -pt|--pause_tracking)
                 echo "└── Switching tracking pause:   $tracking_pause → $2"
                tracking_pause="$2"
                shift 2
                ;;
            --)
                shift
                break
                ;;
            *)
                echo "Internal error"
                exit 1
                ;;
        esac
    done
}

override_default_values() {
    local config_path="$(dirname "$0")/config"

    # Try override default values with values from config file, if exists
    if [ -f "$manager_config_filesDir/clients.conf" ]; then
        source "$config_path/clients.conf"
        echo "clients.conf found"
        echo "└── Switching serviceName:      $service → $beaconService"
        service=$beaconService
    fi

    if [ -f "$manager_config_filesDir/logmonitor.conf" ]; then
        source "$config_path/logmonitor.conf"
        echo "logmonitor.conf found"
        echo "├── Switching target file:      $tracking_definition_file → $beacon_tracking_definition_file"
        echo "├── Switching tigger count:     $tracking_match_triggercount → $beacon_tracking_match_triggercount"
        echo "├── Switching tracking periode: $tracking_periode → $beacon_tracking_periode"
        echo "└── Switching tracking pause:   $tracking_pause → $beacon_tracking_pause"
        tracking_definition_file=$beacon_tracking_definition_file
        tracking_match_triggercount=$beacon_tracking_match_triggercount
        tracking_periode=$beacon_tracking_periode
        tracking_pause=$beacon_tracking_pause
    fi

    # override values with values from params, if attached
    if [ $# -gt 0 ]; then
        parse_args "$@"
    fi

    # Print service configuration
    echo "Beacon Log monitor"
    echo "# service:       $service"
    echo "# definition:    $tracking_definition_file"
    echo "# trigger count: $tracking_match_triggercount"
    echo "# periode:       $tracking_periode"
    echo "# pause:         $tracking_pause"
}

override_default_values

if [ ! -f "$tracking_definition_file" ]; then
    echo "$tracking_definition_file not found / accessible."
    exit 1
fi

echo "Tracking for following actions"
declare -A tracked_actions_arr # from $tracking_definition_file file
#parse by lines
while IFS= read -r line; do
    # split according to first occurancy of ':'
    # parseby :   leftSide  rightSide
    IFS=@ read -r errorType trackedString <<< "$line"
    # each line must contain at least 1x : [type]:[string]
    if [[ -z "$errorType" || -z "$trackedString" ]]; then
        echo "Warning!!!! | Line '$errorType:$trackedString' is not valid."
        continue
    fi

    echo "# $errorType | $trackedString"
    tracked_actions_arr["$errorType"]="$trackedString"
done < "$tracking_definition_file"

last_reset=$(date +%s)

# infinite loop - monitoring is repetitive activity
while true; do
    journalctl -fu $service | while read -r line; do
        current_time=$(date +%s)
        # Reset intervals after $tracking_periode
        if (( current_time - last_reset > tracking_periode )); then
            echo "$service log monitor | Resetting error counts..."
            for key in "${!error_counts[@]}"; do
                error_counts["$key"]=0
            done
            last_reset=$current_time
        fi

        # iterate over realtime log and check it for tracked_actions_arr states
        #$ {!tracked_actions_arr[@]} returns list of all keys
        for error in "${!tracked_actions_arr[@]}"; do
            # $error holds current association key
            # tracked string found in the service log
            #if [[ "$line" == "${tracked_actions_arr[$error]}" ]]; then # lodestarbeacon prints own time etc at the start...
            if [[ "$line" == *"${tracked_actions_arr[$error]}"* ]]; then
                # increase numer of counts for detected error
                ((error_counts["$error"]++))
                
                echo "!!! $error detected $error_counts["$error"] x in last $tracking_periode seconds"
                
                # Process action if error count is higher than $tracking_match_triggercount
                if [[ ${error_counts["$error"]} -ge $tracking_match_triggercount ]]; then

                    echo "$service log monitor | $current_time || $error | count: $error_counts["$error"]"

                    case "$error" in
                        PUBLISH_NoPeers)
                            # echo "PublishError.NoPeersSubscribedToTopic detected $error_counts["$error"] x in last $tracking_periode seconds"
                            # /usr/local/bin/mullvad_change_server.sh
                            ;;
                        #NETWORK_TIMEOUT)
                        #    ...
                        #    ;;
                        *)
                    esac
                    # Reset error counting back to 0
                    error_counts["$error"]=0

                    echo "$service log monitor  | Paused for $tracking_pause seconds"
                    sleep $tracking_pause
                fi
            fi
        done
    done
done