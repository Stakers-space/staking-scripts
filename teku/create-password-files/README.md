# Util for duplicating teku validator keystore password for all keystores in the directory

If you add [multiple teku validators within an instance](https://stakers.space/teku/add-validator), there's required individual password.txt file for each keystores. The name of the password file must be the same as the keystore fil name, just with the difference in ending - password file uses `.txt` while keystore file has `.json` ending.

This Util takes an argument in the form of a link at the password file, e.g. `/var/lib/teku-vi1/keystores/keystore-m_12381_3600_X_0_0-XXXXXXXXXX.txt` and duplicate the `keystore-m_12381_3600_X_0_0-XXXXXXXXXX.txt` file for all remaining keystores at `/var/lib/teku-vi1/keystores` directory. Each newly created file has required filename in teh form of keystoreFileName.txt.

## Install Util to PC
- Check the shell script
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/teku/create-password-files/teku-create-psw-files.sh
```
- Install the shell script
```
sudo curl -o /opt/teku-create-validator-psw-files.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/teku/create-password-files/teku-create-psw-files.sh
```
- Set permissions (executable by all users, writable by root)
```
sudo chmod 755 /opt/teku-create-validator-psw-files.sh
```

## Use the util
/opt/teku-create-validator-psw-files.sh /var/lib/teku-vi1/keystores/keystore-m_12381_3600_X_0_0-XXXXXXXXXX.txt