# JavaScript Utility to load (config) from process arguments


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

## Use
```
const loadFromArgumentsUtil = require('/srv/stakersspace_utils/load-from-process-arguments.js');
loadFromArgumentsUtil(this.config);
```

### This util is required by following tools
- [Validators balance monitor](https://github.com/Stakers-space/staking-scripts/tree/main/monitor/validators_balance)