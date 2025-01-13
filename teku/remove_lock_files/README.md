# Utility shell scripts for removing .lock files

- Check the script
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/teku/remove_lock_files/remove-lock-files.sh
```
- Download the script to `/opt` directory
```
sudo curl -o /opt/remove-teku-validator-lock-files.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/teku/remove_lock_files/remove-lock-files.sh
```
- Enable execution of the shell script
```
sudo chmod +x /opt/remove-teku-validator-lock-files.sh
```
- Use the script
```
/opt/remove-teku-validator-lock-files.sh <directory at which all .json.lock files should be deleted>
```
Sample:
```
/opt/remove-teku-validator-lock-files.sh '/var/lib/teku-validator/validator_keys'
```