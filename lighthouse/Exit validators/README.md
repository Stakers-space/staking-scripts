# Exit all lighthouse validators in an instance

Lighthouse client allows voluntary exits on a single validator only, see [lighthouse voluntary exit documentation](https://lighthouse-book.sigmaprime.io/voluntary-exit.html). This utility script process exits for all validators in a directory (all validators in an instance)

As the script is installed in `/usr/local/bin`, the exit is executable for all server users.

## Installation
- View the script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/lighthouse/Exit%20validators/lighthouse-exit-all-validators.sh
```
- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/bin/lighthouse_exit_validators.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/lighthouse/Exit%20validators/lighthouse-exit-all-validators.sh
```
- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/lighthouse_exit_validators.sh
```

## Usage / how it works
1. Create a password file with keystore encryption password (password defined during keystores generation) at `~/exit/keystore-password.txt`
```
mkdir -p ~/exit
```
```
nano ~/exit/keystore-password.txt
```
Place the encryption password into the file and press `ctrl`+`x`, then `y` to exit and save the file.

2. Process the exit
```
/usr/local/bin/lighthouse_exit_validators.sh <chain> <validatorsDirectory>
```
Arguments
- `<chain>` [mainnet, gnosis]
- `<validatorsDirectory>` path to directory with keystores

### Exit samples:
- If you used [SomerEsat staking guide](https://someresat.medium.com/guide-to-staking-on-ethereum-ubuntu-lighthouse-773f5d982e03):
```
/usr/local/bin/lighthouse_exit_validators.sh mainnet /var/lib/lighthouse/validators/
```
- If you used Stakers.space staking guide for gnosis
```
/usr/local/bin/lighthouse_exit_validators.sh gnosis /var/lib/gnosis/lighthouse/vi1/validators/
```
_Note: Edit the `<vi1>` to specify the proper instance you wish to exit_
- If you used Stakers.space staking guide for mainnet
```
/usr/local/bin/lighthouse_exit_validators.sh mainnet /var/lib/ethereum/lighthouse/vi1/validators/
```
_Note: Edit the `<vi1>` to specify the proper instance you wish to exit_

At first step, the `/usr/local/bin/lighthouse_exit_validators.sh` lists a list of validators in specified `<validatorsDirectory>`. After confirming the exit by pressing `y`, all validators are exited without a need of any other confirmation.