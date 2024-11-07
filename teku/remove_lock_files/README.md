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
/usr/local/bin/remove-lock-files.sh <refferent lock file in directorz in which all .lock file should be deleted>
```
Sample:
```
/usr/local/bin/remove-lock-files.sh '/var/lib/teku-validator/validator_keys/keystore-m_12381_3600_0_0_0-1710000000000.lock'
```