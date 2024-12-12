# Script to get indexes for all pubkeys in validator data file(s)

## Prerequisities
- node.js installed

## data structure
```
get-validator-indexes
    app.js
    └── data (directory)
        ├── offline-preparation.json
        └── deposit_data (directory)
            ├── 1 (directory - accountId)
            │   ├── deposit_data-......json
            │   ├── deposit_data-......json
            │   ├── ...
            └── 2 (directory - accountId)
                ├── ...
                └── deposit_data-......json
utils
    get_files_content
    └── get-files-data-in-directory.js
```
### Usage
Run `node app.js`.
There will be an output in a forms of links to the dashboard with validators on the gnosischa.in