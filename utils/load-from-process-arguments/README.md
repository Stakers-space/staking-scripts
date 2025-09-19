# JavaScript Utility to load (config) from process arguments
This small utility allows you to **override or inject configuration values** directly from CLI arguments when starting a Node.js script.  
It parses `process.argv`, supports both `--key=value` and `--key value` formats, and automatically casts values to `number`, `boolean`, or `null` where applicable.

This makes it easy to adjust configuration (ports, directories, states, etc.) without editing source files.  
It is commonly used in scripts and tools operated by [Stakers.space](https://github.com/Stakers-space).

## Installation
- Check the `load-from-process-arguments.js` util
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/utils/load-from-process-arguments/load-from-process-arguments.js
```
- Create `/srv/stakersspace_utils` directory, if does not exist yet
```
sudo mkdir /srv/stakersspace_utils
```
- Download the script to `/srv/stakersspace_utils/` directory
```
sudo curl -o /srv/stakersspace_utils/load-from-process-arguments.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/utils/load-from-process-arguments/load-from-process-arguments.js
```
- Define service user `stakersspace` (if does not exists yet)
```
sudo useradd --system --no-create-home --shell /bin/false stakersspace
```
- Add `stakersspace` user into the group with NodeJs user (if not added yet)
```
sudo usermod -aG myserveruser stakersspace
```
- Set file ownership dfirectory
```
sudo chown -R stakersspace:stakersspace /srv/stakersspace_utils/load-from-process-arguments.js
```

## Usage
```
const loadFromArgumentsUtil = require('/srv/stakersspace_utils/load-from-process-arguments.js');
loadFromArgumentsUtil(this.config);
```

### Supported formats
- --beaconChain.port=9596
- --states_track.0=withdrawal_done
- --debug true

Values are automatically type-cast:
- "true" → true
- "false" → false
- "null" → null
- "123" → 123 (number)

### This util is required by following tools
- [Validators balance monitor](https://github.com/Stakers-space/staking-scripts/tree/main/monitor/validators_balance)
- [Remove Keystores tool](https://github.com/Stakers-space/staking-scripts/tree/main/tools/remove-keystores)