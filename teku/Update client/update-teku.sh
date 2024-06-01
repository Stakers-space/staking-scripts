#!/bin/bash

# Prerequisities - install staking.sh

declare -r version="1.0.0"
declare stackingManager="/usr/local/bin/staking.sh"
declare -r config_dir="/usr/local/etc/staking/config"

staking_manager_script_check() {
    # check stacking client existence
    if [ ! -f "$stackingManager" ]; then
        echo "$stackingManager not found. Shell script is required. Install it from https://github.com/Stakers-space/staking-scripts/tree/main/manager"
        exit 1
    fi
    
    stakingScriptInitialized=$(stackingManager api isinitialized)
    echo "stakingScriptInitialized: $stakingScriptInitialized"
    if [ "$stakingScriptInitialized" = "false" ]; then
        echo "Stacking client must be initialized. Execute '$stackingManager init' to initialize the script"
        exit 1;
    else
        stakingScriptVersion=$(stackingManager api getversion)
        echo "StakingScript accessible | Script Version: $stakingScriptVersion"
        # check for version to request upgrade, if necessary
    fi
}

# check whether staking.sh is initialized
staking_manager_script_check

# get data from config file
load_config () {
    source "$config_dir/clients.conf"
    source "$config_dir/styling.conf"
    IFS=' ' read -r -a validatorServices_array <<< "$validatorServices"
}
load_config

# check state of beacon and validator services
echo "Services overview:"
stackingManager check

currentTekuVersion=$($beaconClientDir/bin/teku --version)
echo "Current teku version running on the server: $currentTekuVersion"


# updating teku from version  to version
# processed tasks
# 
# 
# 
# 
# press y to confirm the process