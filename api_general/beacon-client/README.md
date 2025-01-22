# Client(s) API to get data from Beaonchain

API is standardized across most consensus clients

[https://ethereum.github.io/beacon-APIs/#/](https://ethereum.github.io/beacon-APIs/#/)

## Default Ports
- Lighthouse beacon: `5052`
- Lodestar beacon: `9596`
- Teku: `5051`
- Nimbus beacon: `5052`
- Prysm: `3500`

## Beacon Endpoints
Note: Change `PORT`, for the port used by the beaconchain client

### Beacon
- `curl -X GET "http://localhost:5052/eth/v1/beacon/headers"` > Get headers
- `curl -X GET "http://localhost:5052/eth/v1/beacon/blocks/16588429/attestations"` > Get attestations for slot `16588429`
- `curl -X GET "http://localhost:5052/eth/v1/beacon/states/head/validators?id=0xa1d1ad0714035353258038e964ae9675dc0252ee22cea896825c01458e1807bfad2f9969338798548d9858a571f7425c"` > Get validator info for pubid `0xa1d1ad0714035353258038e964ae9675dc0252ee22cea896825c01458e1807bfad2f9969338798548d9858a571f7425c`
- `curl -X GET "http://localhost:5052/eth/v1/beacon/rewards/blocks/16588429"` > Get rewards for slot `16588429`
- `curl -X GET "http://localhost:5052/eth/v1/beacon/states/head/finality_checkpoints"` > Get finality checkpoints

### Node
- `curl -X GET "http://localhost:5052/eth/v1/node/identity"` > Get Node Identity
Returns node identificators (node's network presence) such as:
   - `peer_id` that can be used within a trusted-nodes setup
- `curl -X GET "http://localhost:5052/eth/v1/node/peer_count"` > Retrieves number of known peers.
- `curl -X GET "http://localhost:5052/eth/v1/node/peers"` > Get data about the node's network peers.
- `curl -X GET "http://localhost:5052/eth/v1/node/peers/{peer_id}"` > Get data about the given peer


### Services using beaconchain api
- [Validators state monitor](https://github.com/Stakers-space/staking-scripts/tree/main/monitor/validators_state): Get information about validators state (online, offline...)