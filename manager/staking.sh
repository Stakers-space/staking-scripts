#!/bin/bash

declare -r version="1.0.1"
declare -r config_dir="/usr/local/etc/staking/config"

help () {
  echo -e "# Staking management script | ver $version"
  echo -e "# staking.sh [command] [option]"
  echo -e "# ├── help                   Show this help message"
  echo -e "# ├── version                Display version information"
  echo -e "# ├── init                   Generates default configuration files"
  echo -e "# ├── config                 Prints variables from the configuration file"
  echo -e "# ├── start [option]         Start services"
  echo -e "# │   ├── <serviceName>      Start <serviceName> service" 
  echo -e "# │   ├── execution          Start execution service defined in clients.conf" 
  echo -e "# │   ├── beacon             Start beacon service defined in clients.conf" 
  echo -e "# │   ├── validators         Start validator instances defined in clients.conf" 
  echo -e "# │   └── all                Start all staking services defined in clients.conf"
  echo -e "# ├── stop [option]          Stop services"
  echo -e "# │   ├── <serviceName>      Stop <serviceName> service" 
  echo -e "# │   ├── execution          Stop execution service defined in clients.conf" 
  echo -e "# │   ├── beacon             Stop beacon service defined in clients.conf" 
  echo -e "# │   ├── validators         Stop validator instances defined in clients.conf" 
  echo -e "# │   └── all                Stop all staking services defined in clients.conf"
  echo -e "# ├── restart [option]       Restart services"
  echo -e "# │   ├── <serviceName>      Restart <serviceName> service" 
  echo -e "# │   ├── execution          Restart execution service defined in clients.conf" 
  echo -e "# │   ├── beacon             Restart beacon service defined in clients.conf" 
  echo -e "# │   └── validators         Restart validator instances defined in clients.conf" 
  echo -e "# ├── check [option]         Check status of all staking services defined in clients.conf"
  echo -e "# │   ├── <serviceName>      Check status of  <serviceName> service" 
  echo -e "# │   ├── execution          Check status of execution service defined in clients.conf" 
  echo -e "# │   ├── beacon             Check status of beacon service defined in clients.conf" 
  echo -e "# │   └── validators         Check status of validator instances defined in clients.conf" 
  echo -e "# └── monitor [option]       Monitor all staking services defined in clients.conf"
  echo -e "#     ├── <serviceName>      Monitor <serviceName> service" 
  echo -e "#     ├── execution          Monitor execution service defined in clients.conf" 
  echo -e "#     ├── beacon             Monitor beacon service defined in clients.conf" 
  echo -e "#     └── validators         Monitor validator instances defined in clients.conf"
}

get_version() {
  echo -e "StakeManager version | $version"
}

########
# start
start () {
  echo "Start $@"
  case "$1" in
    execution) start_service "$executionService" ;;
    beacon) start_service "$beaconService" ;;
    validators) start_validators ;;
    all)
        start_service "$executionService"
        start_service "$beaconService"
        start_validators
        ;;
    *)
    start_service "$1" ;;
  esac
}

start_validators () {
  for validator in "${validatorServices_array[@]}"; do
    start_service "$validator"
    sleep $validatorServices_instanceStartDelay
  done
}
start_service () {
  local service="$1"
  if [[ -z "$service" ]]; then
      echo -e "Unknown service: $service"
      exit 1
  fi

  if systemctl is-active --quiet "$service"; then
    echo -e "$service is already running"
  else
    echo "Starting $service..."
    # sudo systemctl start "$service"
    echo "DEMO | sudo systemctl start $service"
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}$service started successfully${RESET}"
    else
        echo -e "${RED}Failed to start $service${RESET}"
    fi
  fi
}

########
# stop
stop () {
  echo "Stop $@"
  case "$1" in
    execution) stop_service "$executionService" ;;
    beacon) stop_service "$beaconService" ;;
    validators) stop_validators ;;
    all)
        stop_validators
        stop_service "$beaconService"
        stop_service "$executionService"
        ;;
    *)
    stop_service "$1" ;;
  esac
}
stop_validators () {
  for validator in "${validatorServices_array[@]}"; do
    stop_service "$validator"
  done
}
stop_service() {
    local service="$1"
    if [[ -z "$service" ]]; then
        echo -e "${RED}Unknown service: $service${RESET}"
        exit 1
    fi

    if systemctl is-active --quiet "$service"; then
        echo "Stopping $service..."
        # sudo systemctl stop "$service"
        echo "DEMO | sudo systemctl stop $service"
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}$service stopped successfully${RESET}"
        else
            echo -e "${RED}Failed to stop $service${RESET}"
        fi
    else
        echo -e "${YELLOW}$service is not running${RESET}"
    fi
}

########
# restart
restart () {
  echo "Restart $@"
  case "$1" in
    execution|beacon)
      local serviceName="${1}Service"
      echo "sudo systemctl restart ${!serviceName}"
      # sudo systemctl restart "${!serviceName}"
      ;;
    validators)
      echo "systemctl restart ${validatorServices_array[@]}"
      # sudo systemctl restart "${validatorServices_array[@]}"
      ;;
    *)
    echo "Unknown service: $1. No action taken."
    ;;
  esac
}

########
# monitor
monitor () {
  echo "Monitor $@"
  case "$1" in
    execution|beacon)
      local serviceName="${1}Service"
      journalctl -fu "${!serviceName}"
      ;;
    validators)
      for validatorInstance in "${validatorServices_array[@]}"; do
          journalctl_args+=(-u "$validatorInstance")
      done
      echo "journalctl -f ${journalctl_args[@]}"
      journalctl -f "${journalctl_args[@]}"
      ;;
    *)

    if [ -z "$1" ]; then
      journalctl_args=(-u "$executionService" -u "$beaconService")
      for validatorInstance in "${validatorServices_array[@]}"; do
          journalctl_args+=(-u "$validatorInstance")
      done
      echo "journalctl -f ${journalctl_args[@]}"
      journalctl -f "${journalctl_args[@]}"
    else
      journalctl -fu $1
    fi
    ;;
  esac
}

########
# check
status () {
  echo "Status $@"

  # Note: systemctl status seems to allow to load only 2 services at once

  case "$1" in
    execution|beacon) 
      local serviceName="${1}Service"
      systemctl status "${!serviceName}" ;;
    validators) 
      echo "systemctl status ${validatorServices_array[@]}"
      systemctl status "${validatorServices_array[@]}" 
      ;;
    *)
    
    local -a stakingservices=($executionService $beaconService "${validatorServices_array[@]}")
    #for localService in "${stakingservices[@]}"; do
    #  systemctl status $localService
    #done

    for localService in "${stakingservices[@]}"; do
      if systemctl is-active --quiet "$localService"; then
        echo -e "$localService ${GREEN}is running${RESET}"
      else
        echo -e "$localService ${YELLOW}is not running${RESET}"
      fi
    done
    ;;
  esac
}

init() {
  # create config files
  generate_default_clients_conf_file
  generate_default_styling_conf_file
  print_config
}

api() {
  # api to return data to other scripts
  echo "api $@"
  case "$1" in
    getversion) 
      get_version
    ;;
    isinitialized) 
      if [ -f "$config_dir/clients.conf" ] && [ -f "$config_dir/styling.conf" ]; then
        exit 0
      else
        exit 1
      fi
    ;;
    *)
    echo "API | unknwon command received"
  esac
  # return version
  # return initialization state
}

load_config () {
  if [ -f "$config_dir/clients.conf" ]; then
      source "$config_dir/clients.conf"
      # echo "$config_dir/clients.conf loaded"
  else
      echo "clients.conf not found. Either download the file from github or run './staking.sh init' to generate the file."
      exit 1
  fi

  if [ -f "$config_dir/styling.conf" ]; then
      source "$config_dir/styling.conf"
      # echo "$config_dir/styling.conf loaded"
  else
      echo "styling.conf not found. Either download the file from github or run './staking.sh init' to generate the file."
      exit 1
  fi

  # Transform to array, use space as a separator
  IFS=' ' read -r -a validatorServices_array <<< "$validatorServices"
  # validatorServices_array[0] 
  # validatorServices_array[1]
}

print_config() {
  echo -e "# Loaded configuration from $config_dir/clients.conf"
  echo -e "# ├── execution:  $executionClient → $executionService"
  echo -e "# ├── beacon:     $beaconClient → $beaconService"
  echo -e "# └── validators: $validatorClient → ${validatorServices[@]}"
  echo -e "#     └── start delay: $validatorServices_instanceStartDelay"
}

generate_default_clients_conf_file() {
  if [ ! -f "$config_dir/clients.conf" ]; then
    # Create config directory if it doesn't exist
    mkdir -p "$config_dir"
    cat > "$config_dir/clients.conf" << EOF
# staking clients definition
executionClient="nethermind"
executionService="nethermind.service"
beaconClient="lighthouse"
beaconService="lighthousebeacon.service"
validatorClient="lighthouse"
validatorServices="lighthouse-vi1.service lighthouse-vi2.service"

# Delay in starting validator instances.
# Spreading keystores loading over longer time.
validatorServices_instanceStartDelay=10
EOF
  else
    echo 'staking.sh is already initialized'
  fi
}

generate_default_styling_conf_file() {
if [ ! -f "$config_dir/styling.conf" ]; then
    # Create config directory if it doesn't exist
    mkdir -p "$config_dir"
    cat > "$config_dir/styling.conf" << EOF
# Define styling variables for colors
RESET='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
EOF
  else
    echo 'staking.sh is already initialized'
  fi
}

# load variables from config file
load_config

# Process commands
case "$1" in
    help) help ;;
    version) get_version ;;
    init) init ;;
    config) print_config ;;
    start|stop|restart|monitor|check|api)
        command="$1"
        shift
        case "$command" in
            start) start "$@" ;;
            stop) stop "$@" ;;
            restart) restart "$@" ;;
            monitor) monitor "$@" ;;
            check) status "$@" ;;
            api) api "$@" ;;
        esac
        ;;
    *)

    if [ -n "$1" ]; then
      echo -e "Unspecified command $1 | loading help"
    fi
    help
    ;;
esac