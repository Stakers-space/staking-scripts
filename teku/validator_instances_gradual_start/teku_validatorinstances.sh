#!/bin/bash
declare -r version="1.0.1"

validatorInstances_array=("teku-vi1" "teku-vi2" "teku-vi3" "teku-vi4" "teku-vi5" "teku-vi6" "teku-vi7" "teku-vi8" "teku-vi9")

command=$1
groupDelay=60

start_instance_if_inactive() {
    local index=$1 
    if [[ index -lt ${#validatorInstances_array[@]} ]]; then
        local service_name="${validatorInstances_array[index]}.service"

        if [[ $(systemctl is-active "$service_name") != "active" ]]; then
            sudo systemctl start "$service_name"
            echo "$service_name started | Current state: $(systemctl is-active $service_name)"
        else
            echo "$service_name is already active."
        fi
    fi
}

if [[ "$command" == "start" ]]; then

    echo "Starting Teku validator instances..."
    for (( i=0; i<${#validatorInstances_array[@]}; i+=3 )); do
        start_service_if_inactive $i
        start_service_if_inactive $((i+1))
        start_service_if_inactive $((i+2))

        echo "Waiting $groupDelay seconds before starting next group of instances."
        sleep $groupDelay
    done

elif [[ "$command" == "stop" ]]; then

    echo "Stopping Teku validator instances..."
    for validatorInstance in "${validatorInstances_array[@]}"; do
        sudo systemctl stop "$validatorInstance.service"
        echo "$validatorInstance.service stopped | Current state: $(systemctl is-active $validatorInstance)"
    done

else
    echo "Invalid command. Please use 'start' or 'stop'."
    exit 1
fi