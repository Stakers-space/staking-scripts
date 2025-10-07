/**
 * v 0.0.2
 * remove-keystores.js options
 *      generate snapshot: node ./remove-keystores.js generate-snapshot --beaconChain.port=9596 --states_track.0=withdrawal_done --snapshot_path=/tmp/rk_validators-snapshot
 *      remove keystores:  node ./remove-keystores.js --keystores_dir=$HOME/keystores --snapshot_path=/tmp/rk_validators-snapshot
*/

const fs = require('fs').promises;
const path = require('path');

const { fetchValidatorsSnapshot } = require('./beacon-api.js');
const { GetFilesContent } = require('./filesystem-api.js');
const loadFromArgumentsUtil = require('./load-from-process-arguments.js');

class Config {
    constructor(){
        this.beaconChain = { port: 9596 },
        this.states_track = [/*'active_exiting'*/null, /*'active_ongoing'*/null, /*'exited_unslashed'*/null, /*'pending_initialized'*/null, /*'pending_queued'*/null, /*'withdrawal_done'*/null, /*'withdrawal_possible'*/null];
        this.keystores_dir = process.env.HOME + '/keystores';
        this.snapshot_path = "/tmp/rk_validators-snapshot";
    }
}

class KeystoresTool {
    constructor(){
        this.config = new Config();
        loadFromArgumentsUtil(this.config);
        this.states = (this.config.states_track || []).filter(Boolean); // clear null states
        this.pubkeysByState = Object.fromEntries( this.states.map((s) => [s, new Set()]) );
    }

    // --- SUBCOMMAND: generate-snapshot ---
    async generateSnapshot() {
        const port = this.config.beaconChain.port;

        // prepare output directory
        await fs.mkdir(this.config.snapshot_path, { recursive: true });

        console.log(`Generating snapshots for states [${this.states.join(', ')}] from beacon :${port}`);

        await Promise.all(
            this.states.map(async (state) => {
                try {
                    const snapshotData = await fetchValidatorsSnapshot({
                        beaconBaseUrl: `http://localhost:${port}`,
                        state: "head",
                        status_filter: state
                    });
                    const arr = snapshotData?.data || [];
                    for (const obj of arr) {
                        // https://github.com/Stakers-space/staking-scripts/tree/main/api_general/beacon-client
                        const pk = obj?.validator?.pubkey || null;
                        if (pk) this.pubkeysByState[state].add(pk);
                    }
                    // Save to File
                    const json = {
                        beaconPort: port,
                        state,
                        pubkeys: Array.from(this.pubkeysByState[state])
                    };
                    
                    const snapshotFilePath = `${this.config.snapshot_path}/${state}.json`;
                    await fs.writeFile(snapshotFilePath, JSON.stringify(json, null, 1), 'utf8');
                    console.log(`Snapshot saved → ${snapshotFilePath} | ${this.pubkeysByState[state].size} pubkeys`);
                } catch (e) {
                    console.error(`Failed to fetch state '${state}':`, e.message || e);
                }
            })
        );
    }

    // --- SUBCOMMAND: remove-keystores (default) ---
    async removeKeystores() {
        const snapDir = this.config.snapshot_path;

        if (this.states.length === 0)  return console.warn('No states specified in states_track. Nothing to remove.');
        
        /**
         * Load pubkeys from all tracked_pubkeys snapshots to tracked var.
         */
        const tracked_states_pubkeys = new Set();
        for (const state of this.states) {
            const p = path.join(snapDir, `${state}.json`);
            try {
                const raw = await fs.readFile(p, 'utf8');
                const snap = JSON.parse(raw);
                const list = Array.isArray(snap?.pubkeys) ? snap.pubkeys : [];
                
                for (const pk of list) { tracked_states_pubkeys.add(pk); }
                
                console.log(`Loaded ${list.length} pubkeys from ${p}`);

            } catch (e) {
                console.error(`Cannot read snapshot for state "${state}" at ${p}. Run "generate-snapshot" first or check --snapshot_path.`);
            }
        }

        if (tracked_states_pubkeys.size === 0) return console.warn('No tracked pubkeys loaded. Aborting removal.');
        
        /** Iterate over keystores in  tracked direcotry, compare with tracked_states_pubkeys */
        const keystoresDir = this.config.keystores_dir;
        let files;
        try {
            files = await this.getFilesFromDir(keystoresDir); // wrapper nad callback utilitou (prefix+koncovka) 
        } catch (err) {  
            return console.error(`Failed to read keystores dir "${keystoresDir}":`, err?.message || err);
        }
        
        let removed = 0;
        for (const [fileName, json] of Object.entries(files)) {
            try {
                const keystorePubkey = json?.pubkey ? (json.pubkey.startsWith('0x') ? json.pubkey : '0x' + json.pubkey) : null; // all pubkeys with the tracked state
                if (keystorePubkey && tracked_states_pubkeys.has(keystorePubkey)) {
                    const filePath = path.join(keystoresDir, fileName);
                    await fs.unlink(filePath); // ekvivalent `rm`, smaže soubor
                    removed++;
                    console.log(`Removed keystore: ${filePath} (pubkey ${keystorePubkey})`);
                }
            } catch (err) {
                console.error(`Failed to process file ${fileName}:`, err?.message || err);
            }
        }

        console.log(`Done. Removed ${removed} keystore file(s).`);
    }

    async getFilesFromDir(dir) {
        return new Promise((resolve, reject) => {
            GetFilesContent(dir, 'keystore-m_12381_3600_', ".json", (err, files) => {
                if (err) return reject(err);
                resolve(files);
            });
        });
    }
}

// --- CLI dispatcher ---
(async () => {
  try {
    const cmd = process.argv[2]; // "generate-snapshot" or undefined
    const app = new KeystoresTool();

    if (cmd === 'generate-snapshot') {
      await app.generateSnapshot();
    } else {
      await app.removeKeystores();
    }
  } catch (e) {
    process.exitCode = 1;
  }
})();