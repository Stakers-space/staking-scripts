#!/bin/bash

referrentLockFile=$1

## check instance definition
if [ -z "$referrentLockFile" ]; then
    echo "missing referrentLockFile parameter: $0 | Sample: '/var/lib/teku-validator/validator_keys/keystore-m_12381_3600_0_0_0-1710000000000.json.lock'"
    exit 1
fi

## Check, whether $referrentLockFile exists
if [ -f "$referrentLockFile" ]; then
    echo "✔ Referrent file $referrentLockFile found."
fi

# Get the directory of the keystore file (e.g. /var/lib/teku-validator/validator_keys/)
directory_path=$(dirname "$referrentLockFile")
files=$(ls "$directory_path")
num_files=$(echo "$files" | wc -l)
echo "Referrent file directory is: $directory_path | Files in the folder: $num_files"

# Iterate over files in the folder and delete any .json.lock files
for f in $files; do
    if [[ $f == *.json.lock ]]; then
        echo "Deleting $f"
        rm "$directory_path/$f"
        echo "File $f was deleted."
    fi
done