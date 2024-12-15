# check Inner debt of Gnosis Deposit Contract
GNO rewards to validators are not paid through a emission of new token, instead, they are paid by GnosisDAO.

As the [deposit contract](https://gnosisscan.io/address/0x0b98057ea310f4d31f2a452b414647007d1645d9) processing deposits as wel las withdrawals (including rewards), with each reward (claimed as well as unclaimed), an internal debt is being generated. This debt should be covered by Gnosis DAO to keep all validator funds covered.

Gnosis deposit contract balance is being tracked by Stakers.space. [Check GNO deposit balance online](https://stakers.space/gnosis-staking/deposit-contract-balance)

This script allows to get current state of the internal debt on the deposit contract.

## Prerequisities
- node.js installed
- Synchronized BeaconChain

## Download script to server
- View the script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/beaconchain-client-api/validators-balance/check-balance.js
```
- Download the script to `/opt/stakersspace/gnosis-deposit-contract-balance` directory
```
sudo curl -o check-balance.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/beaconchain-client-api/validators-balance/check-balance.js
```

### Usage
Run `node check-balance.js --etherscanapi-token <token>`.
Token is API token for [https://gnosischa.in/](https://gnosischa.in/)

### Output
```
2024-12-14T15:37:28.669Z Starting check GNO balance in Gnosis Validators Deposit contract
├── loaded EtherscanAPI authentization token: RYMYRJ6NSW6GERX458TM8RXMQNSUDCT1T6 from attached param
├── Processing validators snapshot for head slot state...
|  ├── snapshot completed | registered validators: 434078
|  └── Total GNO balance holded by validators in ETHgwei: 10288036619118656
|      ├── In GNOgwei: 321501144347458
|      └── In GNO: 321501.144347458
├── GNO balance in deposit contract: 302129909328954.06
|    └── In GNO: 302129.90932895406
└── Deposit contract balance: -19371235018503.938
     └── In GNO: -19371.235018503936
GNO distribution || rounded GNO holdings:number of validators {
  '0': 112495,
  '1': 318141,
  '0.9': 2433,
  '1.4': 71,
  '0.8': 333,
  '1.3': 164,
  '1.2': 230,
  '1.1': 211
}
2024-12-14T15:37:37.278Z process completed
```