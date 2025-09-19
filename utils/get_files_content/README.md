# JavaScript Utilities for Directory Operations

This folder contains two small but useful utilities for working with the filesystem in Node.js:

1. **`get-files-data-in-directory.js`**  
   Read and parse JSON content from files in a directory, with optional filename prefix/suffix filtering.

2. **`get-subdirectories.js`**  
   List all immediate subdirectories of a given directory.

---
## 1. get-files-data-in-directory.js

### Description
Reads all files in the given directory and returns their content as parsed JSON objects.  
You can filter files by prefix and/or suffix (e.g. only files starting with `deposit_data-` and ending with `.json`).

### Installation
- Check the `get-files-data-in-directory.js` util
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/utils/get_files_content/get-files-data-in-directory.js
```
- Create `/srv/stakersspace_utils` directory, if does not exist yet
```
sudo mkdir /srv/stakersspace_utils
```
- Download the script to `/srv/stakersspace_utils/` directory
```
sudo curl -o /srv/stakersspace_utils/get-files-data-in-directory.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/utils/get_files_content/get-files-data-in-directory.js
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
sudo chown -R stakersspace:stakersspace /srv/stakersspace_utils/get-files-data-in-directory.js
```

### Usage
```
const path = require('path');
const GetFilesContent = require('/srv/stakersspace_utils/get-files-data-in-directory.js');

const directoryPath = path.join(__dirname, 'data');

GetFilesContent(directoryPath, 'deposit_data-', '.json', (err, content) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Files Content | keys:', Object.keys(content));
        // content is an object: { "filename.json": parsedJson, ... }
    }
});
```
Function Signature
```
GetFilesContent(directoryPath, startsPrefix, endsSuffix, callback)
```
- `directoryPath` (string) – path to the directory.
- `startsPrefix` (string|null) – filename prefix to match (or `null` to ignore).
- `endsSuffix` (string|null) – filename suffix to match (or `null` to ignore).
- `callback` (function) – `(err, result)` where `result` is an object mapping filenames → parsed JSON.


---
## 2. get-subdirectories.js

### Description
Scans a directory and returns a list of subdirectory names.

### Installation
- Check the `get-subdirectories.js` util
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/utils/get_files_content/get-subdirectories.js
```
- Create `/srv/stakersspace_utils` directory, if does not exist yet
```
sudo mkdir /srv/stakersspace_utils
```
- Download the script to `/srv/stakersspace_utils/` directory
```
sudo curl -o /srv/stakersspace_utils/get-subdirectories.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/utils/get_files_content/get-subdirectories.js
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
sudo chown -R stakersspace:stakersspace /srv/stakersspace_utils/get-subdirectories.js
```

### Usage
```
const path = require('path');
const GetSubdirectories = require('/srv/stakersspace_utils/get-subdirectories.js');

const directoryPath = path.join(__dirname, 'data');

GetSubdirectories(directoryPath).then(subdirs => {
    console.log('Subdirectories:', subdirs);
});
```
Function Signature
```
async function GetSubdirectories(directory) → Promise<string[]>
```
- `directory` (string) – path to the directory.
- Returns: a Promise resolving to an array of subdirectory names.