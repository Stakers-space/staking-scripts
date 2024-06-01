#!/bin/bash

chain=$1
validatorsDirectory=$2
beaconNode="${3:-http://localhost:5052}"
lighthouse_app_path="/usr/local/bin/lighthouse"

# Ensure that param $validatorsDirectory ends with '/'
validatorsDirectory="${validatorsDirectory%/}/"

if [ -z "$chain" ]; then
echo "Failed | Missing chain parameter: $0 | Supported chains: [mainnet, gnosis]"
echo "Sample: '/usr/local/bin/lighthouse_exit_validators.sh gnosis /var/lib/gnosis/lighthouse/vi1/validators/'"
exit 1
fi

## check $validatorsDirectory parameter definition
if [ -z "$validatorsDirectory" ]; then
echo "missing validatorsDirectory parameter: $1 | e.g. '/var/lib/gnosis/lighthouse/vi1/validators/'"
echo "Sample: '/usr/local/bin/lighthouse_exit_validators.sh gnosis /var/lib/gnosis/lighthouse/vi1/validators/'"
exit 1
fi

## check validatorsDirectory existence / accessory
if [[ ! -d "$validatorsDirectory" ]]; then
  echo "Validators directory not found: $validatorsDirectory"
  exit 1
fi

echo "Initializing withdrawal prompts for validators at directory $validatorsDirectory"

files=$(ls "$validatorsDirectory")
num_files=$(echo "$files" | wc -l)

iterate_keystores() {
  for f in $files; do
    if [[ ${#f} -gt 2 && ${f:0:2} == "0x" ]]; then
      key_path="$validatorsDirectory$f/"
      key=$(ls "$key_path")
      for k in $key; do
        if [[ ${#k} -gt 22 && ${k:0:22} == "keystore-m_12381_3600_" && ${k: -5} == ".json" ]]; then
          file_path="$key_path$k"

          if [[ $1 == "Exit my validator" ]]; then
             $lighthouse_app_path --network "$chain" account validator exit \
              --keystore "$file_path" \
              --password-file "$HOME/exit/keystore-password.txt" \
              --no-confirmation \
              --beacon-node "$beaconNode"

              if [[ $? -ne 0 ]]; then
                echo "Failed to exit validator: $k | Skipping validator... $file_path"
#               exit 1
              fi
          else
            echo $file_path
          fi
        fi
      done
    fi
  done
}

# List the keystores
iterate_keystores 'List keystores'

echo "Home directory: $HOME | keystore encryption password: $HOME/exit/keystore-password.txt"

# Require confirmation to process exit for listed validator keystores
get_confirmation() {
    while true; do
        read -p "Confirm exit request for listed validators? (y/n): " response
        case "$response" in
            [Yy]) return 0 ;;  # Request confirmed
            [Nn]) return 1 ;;  # Request cancelled
            *) echo "Invalid response. Enter 'y' to continue or 'n' to exit." ;;
        esac
    done
}

if get_confirmation; then
  iterate_keystores 'Exit my validator'
fi