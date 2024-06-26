# Script to get indexes for all pubkeys in validator data file(s)

## Prerequisities
- node.js installed

## data structure
app.js
└── data directory
    ├── offline-preparation.json
    └── deposit_data directory
        ├── deposit_data-......json
        ├── deposit_data-......json
        ├── ...
        └── deposit_data-......json

### Usage
Run `node app.js`.
There will be an output in a forms of links to the dashboard with validators on the gnosischa.in