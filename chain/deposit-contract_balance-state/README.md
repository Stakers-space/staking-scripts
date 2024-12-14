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
sudo curl -o check-balance.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/chain/deposit-contract_balance-state/check-balance.js
```

### Usage
Run `node check-balance.js --etherscanapi-token <token>`.
Token is API token for [https://gnosischa.in/](https://gnosischa.in/)