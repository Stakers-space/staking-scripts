# Script to get count of registered validators in the network from offline-preparation.json file
This provide exact number of validators in the network

## Prerequisities
- node.js installed

## data structure
```
get-validator-indexes
    ├── app.js
    └── offline-preparation.json
       
```
### Usage
Run `node app.js`.
There will be an output in a forms of links to the dashboard with validators on the gnosischa.in


### Sample output for ethereum:
```
Data for epoch 331149
{
  withdrawal_done: 620660,
  active_ongoing: 1065093,
  withdrawal_possible: 9213,
  exited_unslashed: 3632,
  pending_initialized: 618,
  exited_slashed: 23,
  active_exiting: 9
}
```