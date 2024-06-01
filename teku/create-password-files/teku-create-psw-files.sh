#!/bin/bash

referrentPasswordFile=$1

## check instance definition
if [ -z "$referrentPasswordFile" ]; then
echo "missing referrentPasswordFile parameter: $0 | Sample: '/var/lib/teku-validator/validator_keys/keystore-m_12381_3600_0_0_0-1710000000000.txt'"
exit 1
fi

## Check, whether $referrentPasswordFile exists
if [ -f "$referrentPasswordFile" ]; then
echo "✔ Referrent file $referrentPasswordFile found."
fi

# Get the directory of the keystore file (e.g. /var/lib/teku-validator/validator_keys/)
directory_path=$(dirname "$referrentPasswordFile")
files=$(ls "$directory_path")
num_files=$(echo "$files" | wc -l)
echo "Referrent file directory is: $directory_path | Files in the folder: $num_files | keystores:"

# oterate over files in the folder. If is .json, based on its name, generate a password file (if does not exist alredy)
for f in $folders; do
    if [[ $f == *.json ]]; then
        # Get keystore name withou ending
        keystoreName=${f%.*}
        echo "Clean keystore name: $keystoreName"
        # Check existence of txt password file for the keystore
        if [ -f "$directory_path/$keystoreName.txt" ]; then
            echo "Skipping $keystoreName.txt | The file already exist"
        else
            # create .txt keystore file with content from reference file
            cp "$referrentPasswordFile" "${directory_path%/}/$keystoreName.txt"
            echo "Vytvoren soubor $directory_path/$keystoreName.txt was created"
        fi
    fi
done