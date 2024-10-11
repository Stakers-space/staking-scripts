#!/bin/bash

declare -r version="1.0.0"
get_version() {
    echo -e "HW usage monitor version: $version | Powered by https://stakers.space"
    exit 0
}
account_id=$1
account_api_token=$2

# Get Disk usage
disk_usage=$(df -h --output=pcent / | tail -n 1 | tr -d '[:space:]')

# Get RAM and SWAP memmmory usage
ram_usage=$(free -h | awk '/Mem:/ {print $3 "/" $2}')
swap_usage=$(free -h | awk '/Swap:/ {print $3 "/" $2}')

# Post data through GET request
server_url="https://stakers.space/api/hw-report"
curl -G "$server_url" \
    --data-urlencode "acc=$account_id" \
    --data-urlencode "key=$account_api_token" \
    --data-urlencode "disk_usage=$disk_usage" \
    --data-urlencode "ram_usage=$ram_usage" \
    --data-urlencode "swap_usage=$swap_usage"