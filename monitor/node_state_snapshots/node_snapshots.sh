#!/bin/bash

declare -r version="1.0.2"
get_version() {
    echo -e "HW usage monitor version: $version | Powered by https://stakers.space"
    exit 0
}
account_id=$1
account_api_token=$2
server_id=$3

# Get Disk usage
disk_usage=$(df -h --output=pcent / | tail -n 1 | tr -d '[:space:]')

# Get RAM and SWAP memmmory usage
# ram_usage=$(free -h | awk '/Mem:/ {print $3 "/" $2}')
ram_total=$(free | awk '/Mem:/ {print $2}')
ram_used=$(free | awk '/Mem:/ {print $3}')
ram_usage=$(awk "BEGIN {printf \"%.2f\", ($ram_used/$ram_total)*100}")

#swap_usage=$(free -h | awk '/Swap:/ {print $3 "/" $2}')
swap_total=$(free | awk '/Swap:/ {print $2}')
swap_used=$(free | awk '/Swap:/ {print $3}')
swap_usage=$(awk "BEGIN {printf \"%.2f\", ($swap_used/$swap_total)*100}")

# CPU temp (requires sensors) || sudo apt install lm-sensors → sudo sensors-detect → sensors | grep 'Core'
#cpu_temp=$(sensors | grep 'Core 0' | awk '{print $3}' | tr -d '+°C')

# NVMe temp (requires nvme-cli) || sudo apt install nvme-cli → sudo nvme smart-log /dev/nvme0 | grep 'temperature'
# nvme_temp=$(sudo nvme smart-log /dev/nvme0 | grep 'temperature' | awk '{print $3}')


# Check VPN status
vpn_status="Unavailable"
vpn_server="N/A"
if command -v mullvad &> /dev/null; then
    vpn_output=$(mullvad status 2>/dev/null)
    
    if [[ $vpn_output == *"Connecting to"* ]]; then
        vpn_status="Connecting"
        vpn_server=$(echo "$vpn_output" | grep -oP '(?<=Connecting to )[^ ]+')
    elif [[ $vpn_output == *"Connected to"* ]]; then
        vpn_status="Connected"
        vpn_server=$(echo "$vpn_output" | grep -oP '(?<=Connected to )[^ ]+')
    elif [[ $vpn_output == *"Disconnected"* ]]; then
        vpn_status="Disconnected"
    else
        vpn_status="Unknown"
    fi
else
    vpn_status="Mullvad Not Installed"
fi

# get consensus peers (saved by logmonitor) - read from tmp file
beacon_peers="N/A"
peer_file="/tmp/beacon_peers.txt"
if [[ -f "$peer_file" ]]; then
    beacon_peers=$(cat "$peer_file" | tr -d '[:space:]')
fi

echo -e "\nNode snapshot | Posting:"
echo -e "├── account_id:   $account_id"
echo -e "├── api_token:    $account_api_token"
echo -e "├── server_id:    $server_id"
echo -e "├── disk_usage:   $disk_usage"
echo -e "├── ram_usage:    $ram_usage"
echo -e "├── swap_usage:   $swap_usage"
echo -e "├── beacon_peers: $beacon_peers"
echo -e "├── vpn_status:   $vpn_status"
echo -e "└── vpn_server:   $vpn_server"

# Post data through GET request
server_url="https://stakers.space/api/node-snapshot"
curl -G "$server_url" \
    --data-urlencode "acc=$account_id" \
    --data-urlencode "key=$account_api_token" \
    --data-urlencode "srv=$server_id" \
    --data-urlencode "disk_usage=$disk_usage" \
    --data-urlencode "ram_usage=$ram_usage" \
    --data-urlencode "swap_usage=$swap_usage" \
    --data-urlencode "peer=$beacon_peers" \
    --data-urlencode "vpn_s=$vpn_status" \
    --data-urlencode "vpn=$vpn_server"