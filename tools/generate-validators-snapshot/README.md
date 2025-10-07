# Validators Snapshot Generator

CLI tool to fetch and persist validator snapshots from Ethereum-compatible Beacon APIs (Lodestar/Prysm/…). Supports aggregated (no status filter) and per-status snapshots, validates inputs, and writes compact JSON with totals and per-status summaries. For space savings, each validator item stores the status field only in aggregated mode.

## ✨ Features
- Fetch validators via Beacon API: /eth/v1/beacon/states/{state}/validators
- State filtering: null (aggregated) or specific statuses
- states_track as CSV, JSON array, or null for all states
- Validation against a known set of validator states
- Storage: single combined file or one file per status
- Summaries: total counts, sum of balances, sum of effective balances
- Size-optimized: item-level status is written only in aggregated mode

 ## 📦 Requirements
- Node.js 18+
- A reachable Beacon API endpoint (e.g., http://localhost:9596)
- Installed utils below (Installation guide on each util page)
  - [beacon-api lib](https://github.com/Stakers-space/staking-scripts/tree/main/libs/beacon-api)
  - [filesystem-api lib](https://github.com/Stakers-space/staking-scripts/tree/main/libs/filesystem-api)
  - [Load From Process Arguments](https://github.com/Stakers-space/staking-scripts/tree/main/libs/load-from-process-arguments)

## ⚙️ Installation
- Check the `generate-validators-snapshot.js` script
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/tools/generate-validators-snapshot/generate-validators-snapshot.js
```
- Create `/srv/stakersspace_utils` directory, if does not exist yet
```
sudo mkdir /srv/stakersspace_utils
```
- Download the script to `/srv/stakersspace_utils` directory
```
sudo curl -o /srv/stakersspace_utils/generate-validators-snapshot.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/tools/generate-validators-snapshot/generate-validators-snapshot.js
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
sudo chown -R stakersspace:stakersspace /srv/stakersspace_utils/generate-validators-snapshot.js
```

---

## Usage
```
node /srv/stakersspace_utils/generate-validators-snapshot.js
```

## ⚙️ Configuration (CLI Arguments)
| Argument | Description |
|-----------|-------------|
| `--beaconBaseUrl <url>` | Base url of the beacon node (e.g. `http://localhost:9596`). |
| `--states_track <string\|csv\|null>` | List of validator states to include.<br>Example: `active_ongoing` or `active_ongoing,withdrawal_possible`. Do not attach for aggregated snapshot of all states.
| `--output.keepInFile <true\|false>` | Write results to disk (`true`) or print JSON to stdout (`false`). |
| `--output.storageDirectory <path>` | Output directory (default: `/tmp/validator_state_balances`). |
| `--requestDelayMs <number>` | Delay between two state requests (rate limiting). |

- Aggregated snapshot (no filter)
```
node /srv/stakersspace_utils/generate-validators-snapshot.js \
  --beaconBaseUrl http://localhost:9596 \
  --output.keepInFile true \
  --output.storageDirectory /tmp/validator_state_balances
```
- Selected states (CSV)
```
node /srv/stakersspace_utils/generate-validators-snapshot.js \
  --beaconBaseUrl http://localhost:9596 \
  --states_track 'active_ongoing,withdrawal_done' \
  --output.keepInFile true \
  --output.storageDirectory /tmp/validator_state_balances
```
- Output format
```
{
  "timestamp": 1712345678901,
  "epoch": 123456,
  "status": "aggregated", // present only when fetched with state === null
  "execution_optimistic": false,
  "validators": [
    {
      "index": 12345,
      "pubkey": "0x...",
      "balance": 32.0,
      "eff_balance": 32.0,
      "wc": "0x...",
      "slashed": false,
      "e": {
        "activation_eligibility": "0",
        "activation": "0",
        "exit": "18446744073709551615",
        "withdrawable": "18446744073709551615"
      }
      // "status": "active_ongoing"  <-- only in aggregated mode (space saving)
    }
  ],
  "state_counts": {
    "active_ongoing": { "validators": 100, "balance": 3200, "eff_balance": 3200 }
  }
}
```