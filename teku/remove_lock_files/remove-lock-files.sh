#!/bin/bash

# Get the directory path as input
directory_path=$1

## check instance definition
if [ -z "$directory_path" ]; then
    echo "missing directory_path parameter: $0 | Sample: '/var/lib/teku-validator/validator_keys'"
    exit 1
fi

# Remove trailing slash if present
directory_path=${directory_path%/}

## Check, whether the directory exists
if [ -d "$directory_path" ]; then
    echo "✔ Directory $directory_path found."
else
    echo "✘ Directory $directory_path not found."
    exit 1
fi

files=$(ls "$directory_path")
num_files=$(echo "$files" | wc -l)
echo "Directory is: $directory_path | Files in the folder: $num_files"

# Iterate over files in the folder and delete any .json.lock files
for f in $files; do
    if [[ $f == *.json.lock ]]; then
        echo "Deleting $f"
        rm "$directory_path/$f"
        echo "File $f was deleted."
    fi
done

echo "✔ All .json.lock file checks/deletes in $directory_path have been processed."