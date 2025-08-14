# Client(s) API to get data from Beaconchain

API is standardized across most consensus clients

[https://ethereum.github.io/beacon-APIs/#/](https://ethereum.github.io/beacon-APIs/#/)

## Default Ports
- Lighthouse beacon: `5052`
- Lodestar beacon: `9596`
- Teku: `5051`
- Nimbus beacon: `5052`
- Prysm: `3500`
- Caplin: `5555`

## Beacon Endpoints
Note: Change `PORT`, for the port used by the beaconchain client

### Beacon
- `curl -X GET "http://localhost:5052/eth/v1/beacon/headers"` > Get headers
- `curl -X GET "http://localhost:5052/eth/v1/beacon/blocks/16588429/attestations"` > Get attestations for slot `16588429`
- `curl -X GET "http://localhost:5052/eth/v1/beacon/states/head/validators` Get all validators
   - Reponse:
      ```
      {"execution_optimistic":false,
         "finalized":false,
         "data":[
            {
                  "index":"0",
                  "balance":"0",
                  "status":"withdrawal_done",
                  "validator": {
                     "pubkey":"...",
                     "withdrawal_credentials":"...",
                     "effective_balance":"0",
                     "slashed":false,
                     "activation_eligibility_epoch":"0",
                     "activation_epoch":"0",
                     "exit_epoch":"1156542",
                     "withdrawable_epoch":"1156798"
                  }
            },
            {
                  "index":"1",
                  ...
            },
            ...
      ```
- `curl -X GET "http://localhost:5052/eth/v1/beacon/states/head/validators?id=0xa1d1ad0714035353258038e964ae9675dc0252ee22cea896825c01458e1807bfad2f9969338798548d9858a571f7425c"` > Get validator info for pubid `0xa1d1ad0714035353258038e964ae9675dc0252ee22cea896825c01458e1807bfad2f9969338798548d9858a571f7425c`
   - using pubis is functional workaround as well, see `curl -X GET "http://localhost:5052/eth/v1/beacon/states/head/validators?id=1,2,3`
- `curl -X GET "http://localhost:5052/eth/v1/beacon/rewards/blocks/16588429"` > Get rewards for slot `16588429`
- `curl -X GET "http://localhost:5052/eth/v1/beacon/states/head/finality_checkpoints"` > Get finality checkpoints

### Config
- `curl -X GET "http://localhost:5052/eth/v1/config/spec"` > Retrieve specification configuration used on the beacon node.
   - "DEPOSIT_CONTRACT_ADDRESS": [0x00000000219ab540356cBB839Cbe05303d7705Fa](https://etherscan.io/address/0x00000000219ab540356cbb839cbe05303d7705fa) = Ethereum chain
   - "DEPOSIT_CONTRACT_ADDRESS": [0x0B98057eA310F4d31F2a452B414647007d1645d9](https://gnosisscan.io/address/0x0b98057ea310f4d31f2a452b414647007d1645d9) = Gnosis chain

### Node
- `curl -X GET "http://localhost:5052/eth/v1/node/identity"` > Get Node Identity
Returns node identificators (node's network presence) such as:
   - `peer_id` that can be used within a trusted-nodes setup
- `curl -X GET "http://localhost:5052/eth/v1/node/peer_count"` > Retrieves number of known peers.
- `curl -X GET "http://localhost:5052/eth/v1/node/peers"` > Get data about the node's network peers.
- `curl -X GET "http://localhost:5052/eth/v1/node/peers/{peer_id}"` > Get data about the given peer


### Services using beaconchain api
- [Validators state monitor](https://github.com/Stakers-space/staking-scripts/tree/main/monitor/validators_state): Get information about validators state (online, offline...)