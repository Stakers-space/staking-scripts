#!/bin/bash

# define front of tasks
# ./generate-exit-files.sh <directory to place generated exit keys to> <encryption password for keystores>
./generate-exit-files.sh keystores/validator_keys1 12345678
./generate-exit-files.sh keystores/validator_keys2 12345678

# turn off offline PC once all keys are generated
# poweroff
