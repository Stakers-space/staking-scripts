# Caluclate Staking Rewards

Utility scripts for getting validator rewards.

> [!CAUTION]
> Under development. Internal testing release.

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
  - added `--serveHistoricalState` flag (Lodestar) or alternative flag for used client
- Installed utils below (Installation guide on each util page)
  - [Load From Process Arguments](https://github.com/Stakers-space/staking-scripts/tree/main/utils/load-from-process-arguments)


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

### Run Calculation
- For certain day
```
node /srv/stakersspace_utils/calculate-rewards.js \
  --beacon=http://localhost:5052 \
  --validatorIndex=1 \
  --year=2025 \
  --month=9 \
  --day=25
```
- For each day in a certain month
```
node /srv/stakersspace_utils/calculate-rewards.js \
  --beacon=http://localhost:5052 \
  --validatorIndex=1 \
  --year=2025 \
  --month=9
```