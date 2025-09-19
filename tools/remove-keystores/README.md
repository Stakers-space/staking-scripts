# remove-keystores

Utility scripts for managing validator keystores after withdrawal credential consolidation.

With the introduction of validator **consolidations** (see [EIP-7002](https://eips.ethereum.org/EIPS/eip-7002)), operators no longer need to keep old keystores once a validator has finalized its exit or completed withdrawal consolidation.  
This repository provides tools to **generate validator snapshots** and **safely remove obsolete keystores**.

Supported networks:
- Ethereum mainnet
- Gnosis Chain

> [!CAUTION]
> v 0.0.1 - Tool under development. Not tested yet.

---

## Features

- **Generate snapshots** of validator states from a local beacon node REST API (`/eth/v1/beacon/states/head/validators`).  
  Snapshots are stored per state (e.g. `withdrawal_done.json`, `exited.json`) in a configurable directory (default: `/tmp/rk_validators-snapshot`).

- **Remove keystores** that match pubkeys in snapshots.  
  Helps keep validator directories clean and reduces security surface by deleting keystores that are no longer needed.

- Configurable via CLI arguments (`--beaconChain.port`, `--states_track.0`, `--keystores_dir`, `--snapshot_path`, …).

---

## Usage
### Generate snapshots
Fetch validator pubkeys for the configured states and save them into `/tmp/rk_validators-snapshot/<state>.json`:
```
node ./remove-keystores.js generate-snapshot \
  --beaconChain.port=9596 \
  --states_track.0=withdrawal_done \
  --states_track.1=exited \
  --snapshot_path=/tmp/rk_validators-snapshot
```
### Remove keystores
Read snapshots and remove matching keystore files:
```
node ./remove-keystores.js \
  --keystores_dir=$HOME/keystores \
  --states_track.0=withdrawal_done \
  --snapshot_path=/tmp/rk_validators-snapshot
```
### Configuration
- `beaconChain.port`: port of your local beacon API (default: `9596`).
- `states_track`: validator states to track (list: `active_exiting`, `active_ongoing`, `exited_unslashed`, `pending_initialized`, `pending_queued`, `withdrawal_done`, `withdrawal_possible`).
    Set via indexed CLI flags: `--states_track.0=withdrawal_done`, `--states_track.1=withdrawal_possible` ...
- `keystores_dir`: directory containing validator keystores.
- `snapshot_path`: directory for storing and reading per-state snapshots.

### Safety Notes
- Always test first with a backup of your keystores.
- You can extend the tool with a dry-run or trash-mode (move instead of delete) to avoid accidental loss.
- Never delete active keystores for validators that are still running.

### Background
This tool is part of operational housekeeping following EIP-7002 and the introduction of consolidation functionality in the consensus layer.
Once validators are consolidated or exited, their keystores are no longer needed for signing duties and can be safely removed.

Works both on Ethereum mainnet and Gnosis Chain.