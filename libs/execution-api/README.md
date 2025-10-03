## Functions
- get amount of Unclaimed GNO rewards for wallet
```
// single
const { getUnclaimedGNORewardsByWallet } = require('./execution-api');
const r = await getUnclaimedGNORewardsByWallet({
  elBaseUrl: 'http://localhost:8545',
  wallet: '0x1234...abcd'
});
console.log(r); // { wallet, wei: "123456...", gno: "0.123456..." }
```


### Installation
- Check the `execution-api.js` lib
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/libs/execution-api/execution-api.js
```
- Create `/srv/stakersspace_utils/libs` directory, if does not exist yet
```
sudo mkdir /srv/stakersspace_utils
```
- Download the script to `/srv/stakersspace_utils/libs` directory
```
sudo curl -o /srv/stakersspace_utils/libs/execution-api.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/libs/execution-api/execution-api.js
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
sudo chown -R stakersspace:stakersspace /srv/stakersspace_utils/libs/execution-api.js
```