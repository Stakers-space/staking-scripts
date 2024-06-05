#!/usr/bin/env bash

NFT_RULES="/usr/local/etc/mullvad-tailscale_netfilters.rules" # Path to file with netmask rules
NFT_TABLENAME="mullvad-tilescale"

# Do not edit past this point.
# ----------------------------

# Global variables
script_name="$(basename "$0")"
args="$*"

# Functions
## Checks and errors
die() {
  printf "%s Exiting.\n" "$*" 1>&2
  exit 1
}

### Prefix external command output with a string
function prefix_output {
  if [[ $1 != sudo ]]; then
    local prefix=$1
  else
    local prefix=$2
  fi
  prefix=${prefix^^}
  "${@}" 2>&1 | while read -r line; do
    printf "[%s] %s\n" "${prefix}" "${line}"
  done
  # shellcheck disable=SC2086
  return ${PIPESTATUS[0]}
}

bash_version_check() {
  # This script requires Bash >= 4.4 since it uses readarray.
  local error="This script requires Bash >=4.4."
  if [[ ${BASH_VERSINFO[0]} = 4 ]]; then
    if [[ ${BASH_VERSINFO[1]} -lt 4 ]]; then
      die "$error"
    fi
  elif [[ ${BASH_VERSINFO[0]} -lt 4 ]]; then
    die "$error"
  fi
}

### Catch interruption signal.
trap_sigint() {
  # TODO Do a proper cleanup.
  die "Interruption signal caught. Your network might be in a broken state. Run '$script_name $args' again to fix."
}

## Usage functions
help() {
    printf "usage: %s <action> [OPTIONS]\n" "$script_name"
    echo "├── add-rules [OPTIONS]            adds rules to netfilter based on attached file"
    echo "|                 └─ file          definition file with netfilter rules"
    echo "├── remove-rules [OPTIONS]        removes rules to netfilter based on attached file"
    echo "|                 └─ table         nft table that should be removed"
    echo "└── list-rules                     display nft rules"
  exit 0
}

### Check that the nft rules file is valid.
check_nft_rules() {
    if [[ ! -f $NFT_RULES ]]; then
      die "[ERROR] The file '$NFT_RULES' does not exist."
    fi

    if prefix_output sudo nft -cf "$NFT_RULES"; then
      printf "[INFO] NFT tables validity check | nftables rules are valid.\n"
    else
      die "[ERROR] NFT tables validity check | nftables rules are not valid. Fix them before running the script."
    fi
}

remove_nft_rules() {
  printf "[INFO] Removing nftables config...\n"
  if prefix_output sudo nft delete table inet "$NFT_TABLENAME"; then
    printf "[INFO] nftables config removed.\n"
  else
    die "[ERROR] Can't remove table '$NFT_TABLENAME'. Has it already been removed?"
  fi
}

add_nft_rules(){    
    check_nft_rules

    printf "[INFO] Applying nft rules...\n"
    if prefix_output sudo nft -f "$NFT_RULES"; then
        printf "[INFO] nft rules applied\n"
        exit 0
    else
        die "[ERROR] There was an error while applying nft rules."
    fi
}
list_nft_rules(){
    prefix_output sudo nft list ruleset
}

## Main function
main() {

    bash_version_check

    # Get the action to perform
    local actions=("add-rules" "remove-rules")
    action="$1"
    shift

    # Get options and flags
    local ARGS=$(getopt -a --options f:h --long "file:,help" -- "$@")
    eval set -- "$ARGS"

    while true; do
        case "$1" in
            -f|--file)
                NFT_RULES="$2" # Update NFT_RULES if -f or --file is specified
                shift 2
                ;;
            -t|--table)
                NFT_TABLENAME="$2" # Update NFT_RULES if -f or --file is specified
                shift 2
                ;;
            -h|--help)
                help
                exit 0
                ;;
            --)
                break
                ;;
            *)
                die "Unknown option '$1'."
                ;;
        esac
    done

    case "$action" in
        "add-rules") add_nft_rules ;;
        "remove-rules") remove_nft_rules ;;
        "list-rules") list_nft_rules ;;
        *) 
            echo "Invalid action attached"
            help 
            ;;
    esac
}

# _____________________________________
# launch trap_sigint on pressing Ctrl+C
trap trap_sigint SIGINT
# launch main
main "$@"