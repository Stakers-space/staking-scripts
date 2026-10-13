#!/usr/bin/env bash

NFT_RULES="/usr/local/etc/mullvad-tailscale_netfilters.rules" # Path to file with netfilter rules
NFT_TABLENAME=""                                              # Empty = read the table name from NFT_RULES

# Do not edit past this point.
# ----------------------------

# Table name used by previous versions of this utility (typo). Removed automatically on add-rules.
readonly LEGACY_TABLENAME="mullvad-tilescale"

# Global variables
script_name="$(basename "$0")"

# nft requires root. Use sudo only when not running as root already (e.g. not under systemd).
SUDO=()
if [[ $EUID -ne 0 ]]; then
  SUDO=(sudo)
fi

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
  "${@}" 2>&1 | while IFS= read -r line; do
    printf "[%s] %s\n" "${prefix}" "${line}"
  done
  # shellcheck disable=SC2086
  return ${PIPESTATUS[0]}
}

## Usage functions
help() {
    printf "usage: %s <action> [OPTIONS]\n" "$script_name"
    echo "├── add-rules [OPTIONS]            loads rules from the rules file (atomic, safe to run repeatedly)"
    echo "|                 └─ -f|--file     definition file with netfilter rules"
    echo "├── ensure-rules [OPTIONS]         loads rules only if the table is missing (used by the watchdog)"
    echo "|                 └─ -f|--file     definition file with netfilter rules"
    echo "├── check-rules [OPTIONS]          validates the rules file without applying it"
    echo "|                 └─ -f|--file     definition file with netfilter rules"
    echo "├── remove-rules [OPTIONS]         removes the nft table"
    echo "|                 └─ -t|--table    nft table that should be removed"
    echo "├── status [OPTIONS]               shows the loaded table, exit code 1 if it is not loaded"
    echo "|                 └─ -t|--table    nft table that should be displayed"
    echo "└── list-rules                     display the whole nft ruleset"
}

## nft helpers
nft_cmd() {
  prefix_output "${SUDO[@]}" nft "$@"
}

table_exists() {
  "${SUDO[@]}" nft list table inet "$1" >/dev/null 2>&1
}

### Check that the rules file exists and is safe to include
check_rules_file() {
  if [[ ! -f $NFT_RULES ]]; then
    die "[ERROR] The file '$NFT_RULES' does not exist."
  fi
  if [[ $NFT_RULES == *\"* ]]; then
    die "[ERROR] The path '$NFT_RULES' must not contain double quotes."
  fi
}

### Table name is defined by the rules file, so the script and the rules can never get out of sync
resolve_table_name() {
  if [[ -n $NFT_TABLENAME ]]; then
    return
  fi
  check_rules_file
  NFT_TABLENAME=$(sed -nE 's/^[[:space:]]*table[[:space:]]+inet[[:space:]]+([A-Za-z0-9_-]+)[[:space:]]*\{.*$/\1/p' "$NFT_RULES" | head -n 1)
  if [[ -z $NFT_TABLENAME ]]; then
    die "[ERROR] No 'table inet <name> {' definition found in '$NFT_RULES'."
  fi
}

### Print the nft transaction replacing the table with the content of the rules file.
### 'add table' + 'delete table' + new definition in a single 'nft -f' run is applied by kernel
### atomically - there is no moment without rules and repeated runs do not duplicate them.
### If anything in the transaction fails, the currently loaded rules stay untouched.
nft_transaction() {
  printf 'add table inet %s\n' "$NFT_TABLENAME"
  printf 'delete table inet %s\n' "$NFT_TABLENAME"
  if [[ $NFT_TABLENAME != "$LEGACY_TABLENAME" ]]; then
    printf 'add table inet %s\n' "$LEGACY_TABLENAME"
    printf 'delete table inet %s\n' "$LEGACY_TABLENAME"
  fi
  printf 'include "%s"\n' "$(realpath -- "$NFT_RULES")"
}

### Check that the nft rules file is valid.
check_nft_rules() {
    check_rules_file
    resolve_table_name

    if nft_transaction | nft_cmd -c -f -; then
      printf "[INFO] NFT tables validity check | nftables rules are valid.\n"
    else
      die "[ERROR] NFT tables validity check | nftables rules are not valid. Fix them before running the script."
    fi
}

remove_nft_rules() {
  resolve_table_name

  if ! table_exists "$NFT_TABLENAME"; then
    printf "[INFO] Table '%s' is not loaded, nothing to remove.\n" "$NFT_TABLENAME"
    return 0
  fi

  printf "[INFO] Removing nftables config...\n"
  if nft_cmd delete table inet "$NFT_TABLENAME"; then
    printf "[INFO] nftables config removed.\n"
  else
    die "[ERROR] Can't remove table '$NFT_TABLENAME'."
  fi
}

add_nft_rules(){
    check_nft_rules

    printf "[INFO] Applying nft rules...\n"
    if ! nft_transaction | nft_cmd -f -; then
        die "[ERROR] There was an error while applying nft rules. Previously loaded rules were kept."
    fi

    if ! table_exists "$NFT_TABLENAME"; then
        die "[ERROR] nft rules applied, but table '$NFT_TABLENAME' is not loaded."
    fi
    printf "[INFO] nft rules applied (table '%s')\n" "$NFT_TABLENAME"
}

ensure_nft_rules(){
    resolve_table_name

    if table_exists "$NFT_TABLENAME"; then
        printf "[INFO] Table '%s' is loaded.\n" "$NFT_TABLENAME"
        return 0
    fi

    printf "[WARN] Table '%s' is missing, loading rules again...\n" "$NFT_TABLENAME"
    add_nft_rules
}

status_nft_rules(){
    resolve_table_name

    if ! table_exists "$NFT_TABLENAME"; then
        printf "[WARN] Table '%s' is not loaded.\n" "$NFT_TABLENAME"
        exit 1
    fi
    nft_cmd list table inet "$NFT_TABLENAME"
}

list_nft_rules(){
    nft_cmd list ruleset
}

## Main function
main() {
    # Get the action to perform
    local action="${1:-}"
    if [[ $# -gt 0 ]]; then
        shift
    fi

    # Get options and flags
    local parsed
    if ! parsed=$(getopt --options f:t:h --long "file:,table:,help" --name "$script_name" -- "$@"); then
        help 1>&2
        exit 1
    fi
    eval set -- "$parsed"

    while true; do
        case "$1" in
            -f|--file)
                NFT_RULES="$2" # Update NFT_RULES if -f or --file is specified
                shift 2
                ;;
            -t|--table)
                NFT_TABLENAME="$2" # Update NFT_TABLENAME if -t or --table is specified
                shift 2
                ;;
            -h|--help)
                help
                exit 0
                ;;
            --)
                shift
                break
                ;;
            *)
                die "Unknown option '$1'."
                ;;
        esac
    done

    # Value may be attached without the option name as well (file for add/ensure/check, table for remove/status)
    if [[ $# -gt 1 ]]; then
        die "[ERROR] Too many arguments: '$*'."
    fi
    if [[ $# -eq 1 ]]; then
        case "$action" in
            "add-rules"|"ensure-rules"|"check-rules") NFT_RULES="$1" ;;
            "remove-rules"|"status") NFT_TABLENAME="$1" ;;
            *) die "[ERROR] Unexpected argument '$1'." ;;
        esac
    fi

    case "$action" in
        "add-rules") add_nft_rules ;;
        "ensure-rules") ensure_nft_rules ;;
        "check-rules") check_nft_rules ;;
        "remove-rules") remove_nft_rules ;;
        "status") status_nft_rules ;;
        "list-rules") list_nft_rules ;;
        "help"|"-h"|"--help") help ;;
        *)
            echo "Invalid action attached" 1>&2
            help 1>&2
            exit 1
            ;;
    esac
}

# launch main
main "$@"
