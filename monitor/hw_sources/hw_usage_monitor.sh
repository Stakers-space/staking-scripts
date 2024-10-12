#!/bin/bash

declare -r version="1.0.1"
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
nvme_temp=$(sudo nvme smart-log /dev/nvme0 | grep 'temperature' | awk '{print $3}')

# Post data through GET request
server_url="https://stakers.space/api/hw-report"
curl -G "$server_url" \
    --data-urlencode "acc=$account_id" \
    --data-urlencode "key=$account_api_token" \
    --data-urlencode "srv=$server_id" \
    --data-urlencode "disk_usage=$disk_usage" \
    --data-urlencode "ram_usage=$ram_usage" \
    --data-urlencode "swap_usage=$swap_usage"