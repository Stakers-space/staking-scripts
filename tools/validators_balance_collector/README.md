# 🧭 Validators Balance Collector

This script retrieves validator snapshots from a local **Beacon Node API** and stores their balances in JSON files.  
It runs **once per execution** — there’s **no internal scheduler**.  
You can run it periodically via **crontab** or trigger it from a **Node.js app** and get notified when all tasks are finished.

---

## 📦 Requirements

- **Node.js 18+** (for built-in `fetch`)
- [**Synced beacon consensus client**](https://stakers.space/guides)
- Utility libraries:
  - [beacon-api.js lib](https://github.com/Stakers-space/staking-scripts/tree/main/libs/beacon-api)
  - [http-request.js lib](https://github.com/Stakers-space/staking-scripts/tree/main/libs/http-request)
  - [Load From Process Arguments](https://github.com/Stakers-space/staking-scripts/tree/main/libs/load-from-process-arguments)
  - [`filesystem-api.js`](https://github.com/Stakers-space/staking-scripts/tree/main/libs/filesystem-api)
---

## ⚙️ Installation
- Check the `validators_balance_collector.js` script
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/tools/validators_balance_collector/validators_balance_collector.js
```
- Create `/srv/stakersspace_utils` directory, if does not exist yet
```
sudo mkdir /srv/stakersspace_utils
```
- Download the script to `/srv/stakersspace_utils` directory
```
sudo curl -o /srv/stakersspace_utils/validators_balance_collector.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/tools/validators_balance_collector/validators_balance_collector.js
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
sudo chown -R stakersspace:stakersspace /srv/stakersspace_utils/validators_balance_collector.js
```

---

## 3 Options of use
### 1. ▶️ Manual one-time run
```
node /srv/stakersspace_utils/validators_balance_collector.js \
  --beaconChain.port 9596 \
  --output.keepInFile true \
  --output.filesSegmentation true \
  --output.storageDirectory "/tmp/validator_state_balances"
```

### 2. 🕒 Periodic run with crontab (recommended)
Use `crontab` (open with command `crontab -e`) with `flock`, see below:
```
*/5 * * * * flock -n /tmp/val_bal.lock \
  node /srv/stakersspace_utils/validators_balance_collector.js \
    --beaconChain.port 9596 \
    --output.keepInFile true \
    --output.filesSegmentation true \
    --output.storageDirectory "/tmp/validator_state_balances" \
  >> /var/log/validators-balance.log 2>&1
```

### 3. 🔗 Integration with Node.js (trigger on completion)
When the job finishes, the script emits, an IPC message if launched via `child_process.fork` + a stdout token: `@@COMPLETE@@ {...}` or `@@ERROR@@ {...}` — a JSON payload with metadata.
```
import { fork } from 'node:child_process';
import path from 'node:path';

export function runCollectorOnce() {
  return new Promise((resolve, reject) => {
    const script = path.resolve('/srv/stakersspace_utils/validators_balance_collector.js');

    const cp = fork(
      script,
      [
        '--beaconChain.port','9596',
        '--output.keepInFile','true',
        '--output.filesSegmentation','true',
        '--output.storageDirectory','/tmp/validator_state_balances'
      ],
      { stdio: ['inherit','pipe','pipe','ipc'] }
    );

    let buf = ''; let result = null;

    cp.on('message', msg => {
      if (msg?.type === 'complete' || msg?.type === 'error') result = msg;
    });
    cp.stdout.on('data', chunk => {
      buf += chunk.toString();
      const m = buf.match(/@@(COMPLETE|ERROR)@@\s+(\{.*\})/);
      if (m) try { result = JSON.parse(m[2]); } catch {}
    });
    cp.on('exit', code => {
      if (code === 0) resolve(result || { type: 'complete' });
      else reject(Object.assign(new Error('collector exit ' + code), { result }));
    });
    cp.on('error', reject);
  });
}
```

## ⚙️ Command-line options
| Argument | Description |
|-----------|-------------|
| `--beaconChain.port <number>` | Port of the local beacon node (e.g. `9596`). |
| `--states_track <json\|csv\|null>` | List of validator states to include.<br>Example: `["active_ongoing","withdrawal_possible",null]` or `active_ongoing,withdrawal_possible,null`.<br>`null` = aggregated snapshot of all states. Unknown states are ignored. |
| `--output.keepInFile <true\|false>` | Write results to disk (`true`) or print JSON to stdout (`false`). |
| `--output.filesSegmentation <true\|false>` | `true`: one JSON file per state.<br>`false`: single JSON with all states. |
| `--output.storageDirectory <path>` | Output directory (default: `/tmp/validator_state_balances`). |
| `--requestDelayMs <number>` | Delay between two state requests (rate limiting). |

## 📁 Output files
- segmented model: 
```
/tmp/validator_state_balances/<chain>_<state>.json
# e.g. gnosis_active_ongoing.json
```
- Single file mode:
```
/tmp/validator_state_balances/<chain>_states.json
```
All writes are atomic (temporary file + rename). Each successful write is logged as `/tmp/validator_state_balances/<chain>_<state>.json updated`.