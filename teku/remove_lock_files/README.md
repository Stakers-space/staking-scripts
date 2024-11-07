# Utility shell scripts for removing .lock files

- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/bin/remove-lock-files.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/teku/remove_lock_files/remove-lock-files.sh
```
- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/remove-lock-files.sh
```
- Use the script
```
/usr/local/bin/remove-lock-files.sh <directory at which all .json.lock files should be deleted>
```
Sample:
```
/usr/local/bin/remove-lock-files.sh '/var/lib/teku-validator/validator_keys'
```