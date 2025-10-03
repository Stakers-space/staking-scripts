# Caluclate Staking Rewards

Utility scripts for getting validator rewards.

> [!CAUTION]
> Under development. Internal dev/testing release. Do not use.

Supported networks:
- Ethereum mainnet
- Gnosis Chain

---
## Features
- Get Consensus Layer rewards for targeted validator public id for each day in a selected month of a year

---
## Usage
### Prerequisites
- Synced [Consensus (Beacon) client](https://stakers.space/guides)
- Synced [Execution client](https://stakers.space/guides)
- Installed libs & utils below (Installation guide on each util page)
  - [Load From Process Arguments](https://github.com/Stakers-space/staking-scripts/tree/main/libs/load-from-process-arguments)
  - [beacon-api.js lib](https://github.com/Stakers-space/staking-scripts/tree/main/libs/beacon-api) at `/srv/stakersspace_utils/libs`
  - [execution-api.js lib](https://github.com/Stakers-space/staking-scripts/tree/main/libs/execution-api) at `/srv/stakersspace_utils/libs`
  - [http-request.js lib](https://github.com/Stakers-space/staking-scripts/tree/main/libs/http-request) at `/srv/stakersspace_utils/libs`

### Tool Installation
- Check the `calculate-rewards.js` util
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/tools/calculate-rewards/calculate-rewards.js
```
- Create `/srv/stakersspace_utils` directory, if does not exist yet
```
sudo mkdir /srv/stakersspace_utils
```
- Download the script to `/srv/stakersspace_utils/` directory
```
sudo curl -o /srv/stakersspace_utils/calculate-rewards.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/tools/calculate-rewards/calculate-rewards.js
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
sudo chown -R stakersspace:stakersspace /srv/stakersspace_utils/calculate-rewards.js
```

### Run Snapshot
```
node /srv/stakersspace_utils/calculate-rewards.js snapshot \
  --beaconBaseUrl=http://localhost:5052 \
  --executionBaseUrl=http://localhost:5052 \
  --snapshot_state=finalized \
  --pubIdsList=1000,1001,1002 \
  --fileStorageDir=/var/data/snap_$(date -u +%F).jsonl \
  --format=jsonl \
  --verboseLog=true
```
e.g. in cronetab
```
crontab -e
```
```
TZ=UTC
20 0 * * * /usr/bin/flock -n /var/lock/val-snapshot.lock \
  /usr/bin/node /srv/stakersspace_utils/calculate-rewards.js snapshot \
  --beaconBaseUrl=http://localhost:5052 \
  --executionBaseUrl=http://localhost:5052 \
  --snapshot_state=finalized \
  --pubIdsList=1000,1001,1002 \
  --fileStorageDir=/var/data/snap_$(date -u +%F).jsonl \
  --format=jsonl \
  --verboseLog=true \
  >> /var/log/validator_snapshots.log 2>&1
```

### Run Calculation
- Calculates balance difference between daily snapshots
