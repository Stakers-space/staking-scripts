# check Inner debt of Gnosis Deposit Contract
As validator rewards on Gnosis are paid by DAO instead of GNO inner tokenomics like on Ethereum, GnosisDAO needs to keep proper balance of the validator deposit contract.

By default, validator deposit contract is being used for validators deposits as well as withdrawals, including rewards. As these rewards are not produced by GNO inflation, they must be added by Gnosis DAO, otherwise an internal debt in the deposit protocol arises. In other words, there is not enough funds to pay all funds if all validators would decide to exit.

## Prerequisities
- node.js installed

## Download util to server
- View the script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/chain/deposit-contract_balance-state/check-balance.js
```
- Download the script to `/opt/stakersspace/gnosis-deposit-contract-balance` directory
```
sudo curl -o /opt/stakersspace/gnosis-deposit-contract-balance/check-balance.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/chain/deposit-contract_balance-state/check-balance.js
```
- Set ownership
```
sudo chown -R stakersspace:stakersspace /opt/stakersspace/gnosis-deposit-contract-balance
```

## data structure
```
/opt/stakersspace/gnosis-deposit-contract-balance
    ├── check-balance.js
    └── offline-preparation.json
       
```
### Usage
Run `node /opt/stakersspace/gnosis-deposit-contract-balance/check-balance.js --etherscanapi-token <token>`.
Token is API token for [https://gnosischa.in/](https://gnosischa.in/)

> [!IMPORTANT]
> Validators balance is calculated for validators from offline-preparation.json file given to certain epoch while Deposit contract GNO balance is given to time of the check.

> [!NOTE]
> This Util is under construction.