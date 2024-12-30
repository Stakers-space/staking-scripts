# Execution CLient API

- [Nethermind samples](https://docs.nethermind.io/interacting/json-rpc-ns/eth)

- Get Current Block number
```
curl localhost:8545 \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{
      "jsonrpc": "2.0",
      "id": 0,
      "method": "eth_blockNumber",
      "params": []
    }'
```
> [!WARNING]
> Requests below serves for development testing purposes

- `eth_getBalance`
Get GNO Balance ([`0x0B98057eA310F4d31F2a452B414647007d1645d9`](https://gnosisscan.io/address/0x0b98057ea310f4d31f2a452b414647007d1645d9)) in Gnosis Deposit Contract ( [`0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb`](https://gnosisscan.io/address/0x9c58bacc331c9aa871afd802db6379a98e80cedb))
```
curl localhost:8545 \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{
      "jsonrpc": "2.0",
      "id": 1,
      "method": "eth_call",
      "params": [{
          "to": "0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb",
          "data": "0x70a082310000000000000000000000000B98057eA310F4d31F2a452B414647007d1645d9"
      }, "latest"]
  }'
```
- Within the `data`, a certain action is specified through 4bytes of [Keccak-256](https://emn178.github.io/online-tools/keccak_256.html) hash, followed with a wallet
- `eth_call`

Get Withdrawable GNO for withdrawal wallet [0xC40d61Ae90DE3414eB4345BfDeA8Bd2516FBC800](0xC40d61Ae90DE3414eB4345BfDeA8Bd2516FBC800)
```
curl localhost:8545 \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{
      "jsonrpc": "2.0",
      "id": 1,
      "method": "eth_call",
      "params": [{
          "to": "0x0b98057ea310f4d31f2a452b414647007d1645d9",
          "data": "0xbe7ab51b000000000000000000000000c40d61ae90de3414eb4345bfdea8bd2516fbc800"
      }, "latest"]
  }'
```
