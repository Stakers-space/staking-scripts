# Guide to prepare presigned exit keys (& perform a voluntary exit for your validators) using ethdo
At some point, you maight want to exit your validator and obtain your initial deposit plus remaining rewards. This can be processed through any [consensus client](https://stakers.space/clients), or universally, with a use of [ethdo tool](https://github.com/wealdtech/ethdo).

ethdo is a command-line tool for managing common tasks around staking keys. In this section, it is used to generate (pre)sign exit keys for voluntary exit of validators. The keys then can be used for exiting validators online - by uploading them to an online broadcasting tool for selected chain.

## Creating a snapshot of registered validators (offline-preparation.json file)
For an option of generating presigned exit keys, there's required a snapshot of all registered validators in the network. This snapshot is known as `offline-preparation.json` file. Assuming, you are a node operator, with a direct access to beacon node endpoint, you can generate own offline-preparation.json file as follow:

1. Download `ethdo` client to your staking machine
```
wget https://github.com/wealdtech/ethdo/releases/download/v1.36.1/ethdo-1.36.1-linux-amd64.tar.gz
```
```
wget https://github.com/wealdtech/ethdo/releases/download/v1.36.1/ethdo-1.36.1-linux-amd64.tar.gz.sha256
```
2. Compare hash of downloaded file with referrent hash
```
sha256sum ethdo-1.36.1-linux-amd64.tar.gz && cat ethdo-1.36.1-linux-amd64.tar.gz.sha256
```
If hashes matches, you can continue in the guide.

3. Unwrap downloaded file
```
tar xvf ethdo-1.36.1-linux-amd64.tar.gz
```
4. Create the snapshot file `offline-preparation.json`
```
./ethdo validator exit --prepare-offline
```
`Ethdo` will automatically connect beaconchain and create `offline-preparation.json` containing all known validator keystores in connected beaconchain / gnosischain

Otherwise, you can download the `offline-preparation.json` file from the internet.
- Ethereum Mainnet: [offline-preparation-mainnet.tar.gz](https://files.ethstaker.cc/offline-preparation-mainnet.tar.gz) | [sha256](https://files.ethstaker.cc/offline-preparation-mainnet.tar.gz.sha256)
- Gnosis Mainnet: It will be generated and provided by [Stakers.space](http://localhost:8080/contact) on Request.


## Preparing files / tools required for offline keys generation
1. `ethdo` tool
If you did not downloaded `ethdo` client in the previous step, do it now. Complete first 3 steps of [Creating a snapshot of registered validators (offline-preparation.json file)](#creating-a-snapshot-of-registered-validators-offline-preparationjson-file) section

2. `offline-preparation.json`
This file was downloaded / generated in the previous step

3. Download `generate-exit-files.sh` and `generate-exit-files-planner.sh` scripts
This utility script simplifies keys generation as it allow bulk generation. It comes in handy is you need generate pre-signed exit keys for higher number of validators.
```
curl -LO https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/ethdo/presigned-exit-keys/generate-exit-files.sh
```
```
curl -LO https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/ethdo/presigned-exit-keys/generate-exit-files-planner.sh
```

### Move files to offline machine
From the staking machine (or PC you have the files on), either locally through the USB stick or remotly over `scp`, copy `offline-preparation.json`, `ethdo`, `generate-exit-files.sh`, `generate-exit-files-planner.sh` on USB stick and move the files into your offline Linux PC (You can use e.g. Tails OS)

## Generating presigned keys on your offline PC
Create following structure on your offline machine.
```
staking
├── keystores
│   ├── validator_keys1 (directory containing keystores)
│   ├── validator_keys2 (directory containing keystores)
│   └── ...
└── exit-keys
    ├── ethdo (client)
    ├── offline-preparation.json 
    ├── generate-exit-files.sh
    ├── generate-exit-files-planner.sh
    └── keystores
```
- Open `generate-exit-files-planner.sh` and specify directories with keystores you want to generate presigned exit keys for
```
nano generate-exit-files-planner.sh
```
See the sample below
```
# define front of tasks
# ./generate-exit-files.sh <directory to place generated exit keys to> <encryption password for keystores>
./generate-exit-files.sh keystores/validator_keys1 12345678
./generate-exit-files.sh keystores/validator_keys2 12345678
```
- Start processing presigned exit keys for all keystores in specified directories
Run following command from the offline PC terminal
```
./generate-exit-files-planner.sh
```
> The script will start process generation of exit keys for all keystores inside specified directories `keystores/validator_keys1` and `keystores/validator_keys1`. Signed exit keys will be generated into directories of the same name, only within the `exit-keys` directory. Based on the sample above it would be `exit-keys/keystores/validator_keys1` and `exit-keys/keystores/validator_keys2`.
Do not forget to replace `12345678` for proper encryption passwords for keystores in the specified directories.

## Process the exit
Once you want exit any validator, broadcast its signed exit key into beacon broadcasting tool.
- Ethereum Beaconchain Broadcasting tool: [https://beaconcha.in/tools/broadcast](https://beaconcha.in/tools/broadcast)
- Gnosis Gnosischain Broadcasting tool: [https://gnosischa.in/tools/broadcast](https://gnosischa.in/tools/broadcast)

