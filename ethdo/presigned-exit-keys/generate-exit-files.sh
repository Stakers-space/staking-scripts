#!/bin/bash

# this scripts process exit key generation for all keystores in a given directory. It works for Ethereum Mainnet and Gnosis keystores
# https://github.com/eth-educators/ethstaker-guides/blob/main/voluntary-exit.md
# ./ethdo validator exit --validator="keystore-m_12381_3600_0_0_0-1670000000.json" --passphrase='testing123' --json --offline > 459921-exit.json

# This script must be placed in the same directory with ethdo client
keystoresDirectory=$1
keystorePass=$2

## check instance definition
if [ -z "$keystoresDirectory" ]; then
echo "missing directory with keystore data parameter: $0 | e.g. vn/validator_keys_gno_vn_w3"
exit 1
fi

if [ -z "$keystorePass" ]; then
echo "missing pass for keystore data parameter: $1 | e.g. 12345678"
exit 1
fi

echo "Initializing exit files creation for keystores at $keystoresDirectory"

if [[ ! -d "$PWD/../$keystoresDirectory" ]]; then
  echo "Keystore directory not found: $PWD/../$keystoresDirectory"
  exit 1
fi

files=$(ls "$PWD/../$keystoresDirectory")
num_files=$(echo "$files" | wc -l)
createdExitFiles=0

# Check directory existence. If it does not exist, create it.
if [ ! -d "$keystoresDirectory" ]; then
    mkdir -p "$keystoresDirectory"
    echo "Directory '$keystoresDirectory' was created."
fi

echo "files in the folder: $num_files | keystores:"
for f in $files; do
    if [[ $f == keystore-m_*.json ]]; then
        # get name without ending
        keystoreName=${f%.*}

        # trigger exit msg creation
        ./ethdo validator exit --validator="$PWD/../$keystoresDirectory/$f" --passphrase=$keystorePass --json --offline > "$keystoresDirectory/$keystoreName-exit.json"

        ((createdExitFiles++))
        echo "$createdExitFiles/$num_files | Exit file for $f generated."
    fi
done

exit 0