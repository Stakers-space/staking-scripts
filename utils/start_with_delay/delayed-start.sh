#!/bin/bash

# Wait for 300 seconds (= 5 minutes)
sleep 300

# Launch defined services
# mullvad connect
systemctl start service_1
systemctl start service_2
# ...