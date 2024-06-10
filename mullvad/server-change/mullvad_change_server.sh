#!/bin/bash
declare -r version="1.0.0"
# List with preferred VPN server locations
declare -a RELAY_LOCATIONS=("cz prg" "de fra" "de ber" "de dus" "at vie" "pl waw" "sk bts")
#readarray -t MULLVAD_RELAYS < <(mullvad relay list | awk '/wireguard|wg/ { print $1 }')
#readarray -t MULLVAD_RELAYS < <(printf '%s\n' "${MULLVAD_RELAYS[@]}" | grep -E "^$country_code")

# Cache current server (for later check)
ORIGINAL_STATUS=$(mullvad status)
# Separate GEO id from mullvad status response (format: "Connected to us-atl-wg-110 in Atlanta, United States")
CURRENT_LOCATION=$(echo $ORIGINAL_STATUS | grep -oP 'Connected to \K\w{2}-\w{3}' | tr '-' ' ')
echo "Mullvad VPN  | current active location | $ORIGINAL_STATUS → $CURRENT_LOCATION"

# Get current relay location index in RELAY_LOCATIONS
CURRENT_INDEX=-1
for i in "${!RELAY_LOCATIONS[@]}"; do
   if [[ "${RELAY_LOCATIONS[$i]}" == "$CURRENT_LOCATION" ]]; then
       CURRENT_INDEX=$i
       break
   fi
done

# Choose a new relay server from the list to connect in
if [ $CURRENT_INDEX -ne -1 ]; then
    # Server is connected to a relay from the list, switch to next relay from the list
    NEXT_INDEX=$(( (CURRENT_INDEX + 1) % ${#RELAY_LOCATIONS[@]} ))
    NEXT_LOCATION=${RELAY_LOCATIONS[$NEXT_INDEX]}
else
    # Server is not connected to a relay from the list, switch to random relay from the list
    NEXT_LOCATION=${RELAY_LOCATIONS[$RANDOM % ${#RELAY_LOCATIONS[@]}]}
fi

# Set new mullvad connection
echo "mullvad relay set location $NEXT_LOCATION"
mullvad relay set location $NEXT_LOCATION

# Get new state
NEW_STATUS=$(mullvad status)

# Check the change
if [[ "$NEW_STATUS" != "$ORIGINAL_STATUS" ]]; then
    echo "Mullvad VPN | connection successfully changed | from $ORIGINAL_STATUS → $NEW_STATUS"
    exit 0
else
    echo "Mullvad VPN | connection change failed | Current state: $NEW_STATUS"
    exit 1
fi