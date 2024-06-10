#!/bin/bash

# Get Swap usage
#used_swap=$(free | grep Swap | awk '{print $3}')
used_swap=$(free | awk '/Swap/ {print $3}')
# Threshold for swap usage in kilobytes (4GB)
threshold=4194304

echo "Swap usage: $used_swap"

#if [ "$used_swap" -gt 4194302 ]; then
    echo "Warn: Swap usage over 4GB"
    # get process with highest swap usage
    highest_swap_process=$(sudo ps -eo pid,comm,vsz,swap --sort=-swap | head -n 2 | tail -n 1)
    echo "Process with the highest swap usage: $highest_swap_process"

    # Extract the PID of the process with the highest swap usage
    pid_of_highest_swap=$(echo "$highest_swap_process" | awk '{print $1}')
    echo "pid_of_highest_swap: $pid_of_highest_swap"

    # restart the process
    # sudo systemctl restart service_name.service
#fi