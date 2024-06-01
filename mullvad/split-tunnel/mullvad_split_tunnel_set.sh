#!/bin/bash
# check sync status of timedatectl
sync_status=$(timedatectl status | grep -oP 'System clock synchronized: \K\w+')

if [[ $sync_status == "no" ]]; then

    # system time is not synchronized - set split tunnel for systemd-timesyncd service
	
	# Get PID of systemd-timesyncd
	SERVICE_PID=$(pgrep -f systemd-timesyncd)

	if [[ ! -z "$SERVICE_PID" ]]; then
		# Add PID to Mullvad split tunnel configuration
		mullvad split-tunnel add $SERVICE_PID
		echo "New VPN Split tunnel was set for PID $SERVICE_PID"
        exit 0
	else
		echo "Failed to get PID of systemd-timesyncd."
        exit 1
	fi
else
    echo "System time is synchronized, no need of setting VPN split tunnel"
    exit 0
fi