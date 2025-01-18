#!/bin/bash

ACCOUNT_ID=0
SERVER_ID=0
API_TOKEN=""
API_BEACON_PORT=0
API_URL="https://stakers.space/api/node-snapshot"
DO_NOT_SEND=0

declare -r version="1.0.5"
get_version() {
    echo -e "HW usage monitor version: $version | Powered by https://stakers.space"
    exit 0
}

use_shell_parameters() {
    TEMP=$(getopt -o a:s:t:p:u:d: --long account_id:,server_id:,api_token:,beacon_port:,api_url:,donotsend:, -- "$@")
    eval set -- "$TEMP"

    while true; do
        case "$1" in
            -a|--account_id)
                ACCOUNT_ID="$2"
                shift 2
                if [ -z "$ACCOUNT_ID" ]; then
                    echo "Error: No Account ID specified."
                    exit 1
                fi
                ;;
            -s|--server_id)
                SERVER_ID="$2"
                shift 2
                if [ -z "$SERVER_ID" ]; then
                    echo "Error: No Server ID specified."
                    exit 1
                fi
                ;;
            -t|--api_token)
                API_TOKEN="$2"
                shift 2
                if [ -z "$API_TOKEN" ]; then
                    echo "Error: No API token specified."
                    exit 1
                fi
                ;;
            -p|--beacon_port)
                API_BEACON_PORT="$2"
                shift 2
                if [ -z "$API_BEACON_PORT" ]; then
                    echo "Error: No API BEACON PORT specified. Default ports by clients | 5052: Lighthouse, Nimbus | 5051: Teku | 9596: Lodestar"
                    exit 1
                fi
                ;;
            -d|--donotsend)
                DO_NOT_SEND="$2"
                shift 2
                ;;
            -u|--api_url) 
                API_URL="$2"
                shift 2
                if [ -z "$API_URL" ]; then
                    echo "Error: No API URL specified."
                    exit 1
                fi
                ;;
             --) 
                shift
                break
                ;;
            *)
                echo "Warning | Unknown parameter $2 | all parameters $@"
                exit 1
                ;;
        esac
    done
}

print_hello_message() {
    echo -e "\nNode Snapshots generator - Monitor your node from Stakers.space cloud dashboard | version: $version | Created by https://stakers.space"
    echo -e "├── -a|--account_id (= $ACCOUNT_ID):  Account ID at Stakers.space"
    echo -e "├── -s|--server_id  (= $SERVER_ID):   Server ID at Stakers.space"
    echo -e "├── -t|--api_token  (= $API_TOKEN):   token for communication with Stakers.space API"
    echo -e "└── -p|--beacon_port  (= $API_BEACON_PORT): Beacon Port API"
}

use_shell_parameters "$@"
print_hello_message

get_disk_usage() {
    # Get Disk usage
    disk_usage=$(df -h --output=pcent / | tail -n 1 | tr -d '[:space:]')
}
get_disk_usage

get_ram_stats() {
    # Get RAM and SWAP memmmory usage
    # ram_usage=$(free -h | awk '/Mem:/ {print $3 "/" $2}')
    ram_total=$(free | awk '/Mem:/ {print $2}')
    ram_used=$(free | awk '/Mem:/ {print $3}')
    ram_usage=$(awk "BEGIN {printf \"%.2f\", ($ram_used/$ram_total)*100}")
}
get_ram_stats

get_swap_stats() {
    #swap_usage=$(free -h | awk '/Swap:/ {print $3 "/" $2}')
    swap_total=$(free | awk '/Swap:/ {print $2}')
    swap_used=$(free | awk '/Swap:/ {print $3}')
    swap_usage=$(awk "BEGIN {printf \"%.2f\", ($swap_used/$swap_total)*100}")
}
get_swap_stats

# CPU temp (requires sensors) || sudo apt install lm-sensors → sudo sensors-detect → sensors | grep 'Core'
#cpu_temp=$(sensors | grep 'Core 0' | awk '{print $3}' | tr -d '+°C')

# NVMe temp (requires nvme-cli) || sudo apt install nvme-cli → sudo nvme smart-log /dev/nvme0 | grep 'temperature'
# nvme_temp=$(sudo nvme smart-log /dev/nvme0 | grep 'temperature' | awk '{print $3}')

get_vpn_status() {
    # Check VPN status
    vpn_status="Unavailable"
    vpn_server="N/A"
    if command -v mullvad &> /dev/null; then
        vpn_output=$(mullvad status 2>/dev/null)

        connected=$(echo "$vpn_output" | grep -m 1 -E "Connected|Disconnected" | awk '{print $1}')
        if [ "$connected" == "Connected" ]; then
            vpn_status="Connected"
            vpn_server=$(echo "$vpn_output" | grep "Relay" | awk -F': ' '{print $2}' | sed 's/^ *//')
            echo "Connected: $connected"
            echo "Relay: $vpn_server"
        elif [[ $connected == "Disconnected" ]]; then
            vpn_status="Disconnected"
        else
            vpn_status="Unknown"
        fi
        
        #if [[ $vpn_output == *"Connecting to"* ]]; then
        #    vpn_status="Connecting"
        #    vpn_server=$(echo "$vpn_output" | grep -oP '(?<=Connecting to )[^ ]+')
        #elif [[ $vpn_output == *"Connected to"* ]]; then
        #    vpn_status="Connected"
        #    vpn_server=$(echo "$vpn_output" | grep -oP '(?<=Connected to )[^ ]+')
        #elif [[ $vpn_output == *"Disconnected"* ]]; then
        #    vpn_status="Disconnected"
        #else
        #    vpn_status="Unknown"
        #fi
    else
        vpn_status="Mullvad Not Installed"
    fi
}
get_vpn_status


get_beacon_peers_count() {
    # get consensus peers (saved by logmonitor) - read from tmp file
    #beacon_peers="N/A"
    #peer_file="/tmp/beacon_peers.txt"
    #if [[ -f "$peer_file" ]]; then
    #    beacon_peers=$(cat "$peer_file" | tr -d '[:space:]')
    #fi

    # Native API way of getting peers coun instead of depandand log tracking trough beacon log monitor
    beacon_api_peers_count_response=$(curl -s --connect-timeout 3 --max-time 8 -X GET "http://localhost:$API_BEACON_PORT/eth/v1/node/peer_count")
    if [[ -z "$beacon_api_peers_count_response" ]]; then
        echo "Error: No response from http://localhost:$API_BEACON_PORT/eth/v1/node/peer_count API."
        return 1
    fi
    
    beacon_peers=$(echo "$beacon_api_peers_count_response" | awk -F'"connected":"' '{print $2}' | awk -F'"' '{print $1}')
    if [[ -z "$beacon_peers" ]]; then
        echo "Error: Unable to extract 'connected' value from Beacon API response: $beacon_api_peers_count_response"
        return 1
    fi
}
get_beacon_peers_count

echo -e "\nNode snapshot | Posting:"
echo -e "├── account_id:   $ACCOUNT_ID"
echo -e "├── server_id:    $SERVER_ID"
echo -e "├── api_token:    $API_TOKEN"
echo -e "├── disk_usage:   $disk_usage"
echo -e "├── ram_usage:    $ram_usage"
echo -e "├── swap_usage:   $swap_usage"
echo -e "├── beacon_peers: $beacon_peers"
echo -e "├── vpn_status:   $vpn_status"
echo -e "└── vpn_server:   $vpn_server"

if [[ "$DO_NOT_SEND" -eq 0 ]]; then
# Post data through GET request
curl -G "$API_URL" \
    --data-urlencode "acc=$ACCOUNT_ID" \
    --data-urlencode "srv=$SERVER_ID" \
    --data-urlencode "key=$API_TOKEN" \
    --data-urlencode "disk_usage=$disk_usage" \
    --data-urlencode "ram_usage=$ram_usage" \
    --data-urlencode "swap_usage=$swap_usage" \
    --data-urlencode "peer=$beacon_peers" \
    --data-urlencode "vpn_s=$vpn_status" \
    --data-urlencode "vpn=$vpn_server"
fi