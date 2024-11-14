#!/bin/bash

declare -r version="1.0.9 (test release)"
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
  echo -e "# ├── check|status [option]         Check status of all staking services defined in clients.conf"
  echo -e "# │   ├── <serviceName>      Check status of  <serviceName> service" 
  echo -e "# │   ├── execution          Check status of execution service defined in clients.conf" 
  echo -e "# │   ├── beacon             Check status of beacon service defined in clients.conf" 
  echo -e "# │   └── validators         Check status of validator instances defined in clients.conf" 
  echo -e "# └── monitor [option]       Monitor all staking services defined in clients.conf"
  echo -e "#     ├── <serviceName>      Monitor <serviceName> service" 
  echo -e "#     ├── execution          Monitor execution service defined in clients.conf" 
  echo -e "#     ├── beacon             Monitor beacon service defined in clients.conf" 
  echo -e "#     └── validators         Monitor validator instances defined in clients.conf"
  echo -e "################################################################################"
  print_config
}

get_version() {
  echo -e "StakeManager version | $version"
}

########
# start
start () {
  echo "Starting services $@"
  select_services_array "$1"
  manage_services start "${services[@]}" $validatorServices_instanceStartDelay
}
stop () {
  echo "Stopping services: $@"
  select_services_array "$1"
  manage_services stop "${services[@]}"
}
restart () {
  echo "Restarting services: $@"
  select_services_array "$1"
  manage_services restart "${services[@]}" $validatorServices_instanceStartDelay
}
# check
status () {
  echo "Checking status of services: $@"
  select_services_array "$1"
  for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo -e "$service ${GREEN}is running${RESET}"
    else
        echo -e "$service ${YELLOW}is not running${RESET}"
    fi
  done
}

monitor () {
  echo "Monitoring services: $@"
  select_services_array "$1"
  journalctl_args=()
  for service in "${services[@]}"; do
    journalctl_args+=(-u "$service")
  done
  echo "journalctl -f ${journalctl_args[@]}"
  journalctl -f "${journalctl_args[@]}"
}

######## Utils

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
    # echo "DEMO | sudo systemctl start $service"
    sudo systemctl start "$service"
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}$service started successfully${RESET}"
    else
        echo -e "${RED}Failed to start $service${RESET}"
    fi
  fi
}

stop_service() {
    local service="$1"
    if [[ -z "$service" ]]; then
        echo -e "${RED}Unknown service: $service${RESET}"
        exit 1
    fi

    if systemctl is-active --quiet "$service"; then
        echo "Stopping $service..."
        # echo "DEMO | sudo systemctl stop $service"
        sudo systemctl stop "$service"
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}$service stopped successfully${RESET}"
        else
            echo -e "${RED}Failed to stop $service${RESET}"
        fi
    else
        echo -e "${YELLOW}$service is not running${RESET}"
    fi
}

manage_services () {
  local action="$1"
  shift
  local services=("$@")
  local delay=${services[-1]}

  if [[ "$delay" =~ ^[0-9]+$ ]]; then
    unset services[-1]
  else
    delay=0
  fi

  if [[ "$action" == "start" ]]; then
    for service in "${services[@]}"; do
      start_service "$service"
      if [[ $delay -gt 0 ]]; then
        sleep $delay
      fi
    done
  elif [[ "$action" == "stop" ]]; then
    for (( i=${#services[@]}-1; i>=0; i-- )); do
      stop_service "${services[i]}"
    done
  elif [[ "$action" == "restart" ]]; then
    for service in "${services[@]}"; do
      stop_service "$service"
      start_service "$service"
      if [[ $delay -gt 0 ]]; then
        sleep $delay
      fi
    done
  else
    echo "Unsupported action: $action"
    exit 1
  fi
}

select_services_array() {
  case "$1" in
    execution)
        services=("${executionServices_array[@]}")
        ;;
    beacon)
        services=("${beaconServices_array[@]}")
        ;;
    validators)
        services=("${validatorServices_array[@]}")
        ;;
    consensus)
        services=("${beaconServices_array[@]}" "${validatorServices_array[@]}")
        ;;
    "" | all)
        services=("${executionServices_array[@]}" "${beaconServices_array[@]}" "${validatorServices_array[@]}")
        ;;
    *)
        services=("$1")
        ;;
  esac
}

### System
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
      echo "clients.conf not found. Either download the file from github or run '/usr/local/bin/staking.sh init' to generate the file."
      exit 1
  fi

  if [ -f "$config_dir/styling.conf" ]; then
      source "$config_dir/styling.conf"
      # echo "$config_dir/styling.conf loaded"
  else
      echo "styling.conf not found. Either download the file from github or run '/usr/local/bin/staking.sh init' to generate the file."
      exit 1
  fi

  # Transform to array, use space as a separator
  IFS=' ' read -r -a executionServices_array <<< "$executionServices"
  IFS=' ' read -r -a beaconServices_array <<< "$beaconServices"
  IFS=' ' read -r -a validatorServices_array <<< "$validatorServices"
}

print_config() {
  echo -e "# Loaded configuration from $config_dir/clients.conf"
  echo -e "# ├── execution services:  ${executionServices_array[@]}"
  echo -e "# ├── beacon services:     ${beaconServices_array[@]}"
  echo -e "# ├── validator instances: ${validatorServices_array[@]}"
  echo -e "# |   └── start delay:     $validatorServices_instanceStartDelay"
  echo -e "# └── consensus services:  ${beaconServices_array[@]} ${validatorServices_array[@]}"
}

generate_default_clients_conf_file() {
  if [ ! -f "$config_dir/clients.conf" ]; then
    # Create config directory if it doesn't exist
    mkdir -p "$config_dir"
    cat > "$config_dir/clients.conf" << EOF
# staking clients definition
executionClients="nethermind"
executionServices="nethermind.service"
beaconServices="lighthousebeacon.service"
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
if [[ "$1" != "help" && "$1" != "version" && "$1" != "init" ]]; then
    load_config
fi

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
            check|status) status "$@" ;;
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