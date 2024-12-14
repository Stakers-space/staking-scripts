# check Inner debt of Gnosis Deposit Contract
GNO rewards to validators are not paid through a emission of new token, instead, they are paid by GnosisDAO.

As the [deposit contract](https://gnosisscan.io/address/0x0b98057ea310f4d31f2a452b414647007d1645d9) processing deposits as wel las withdrawals (including rewards), with each reward (claimed as well as unclaimed), an internal debt is being generated. This debt should be covered by Gnosis DAO to keep all validator funds covered.

This script allows to get current state of the internal debt on the deposit contract.

## Prerequisities
- node.js installed
- Synchronized BeaconChain

## Download script to server
- View the script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/chain/deposit-contract_balance-state/check-balance.js
```
- Download the script to `/opt/stakersspace/gnosis-deposit-contract-balance` directory
```
sudo curl -o check-balance.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/chain/deposit-contract_balance-state/check-balance.js
```

### Usage
Run `node check-balance.js --etherscanapi-token <token>`.
Token is API token for [https://gnosischa.in/](https://gnosischa.in/)

### Output
```
2024-12-14T14:55:11.283Z Starting check GNO balance in Gnosis Validators Deposit contract
├── Processing validators snapshot for head slot state...
|  ├── snapshot completed | registered validators: 434078
|   └── Total GNO balance holded by validators in ETHgwei: 10288039667369380
|      ├── In GNOgwei: 321501239605293.1
|      └── In GNO: 321501.23960529314
├── GNO balance in deposit contract: 302028889463846.6
|    └── In GNO: 302028.88946384663
└── Deposit contract balance: -19472350141446.5
|    └── In GNO: -19472.3501414465
2024-12-14T14:55:18.874Z process completed
```