# JavaScript lib-util for File system Operations

This folder contains multiple small but useful utilities for working with the filesystem in Node.js.

## 2. `get-files-data-in-directory.js`
   Reads all files in the given directory and returns their content as parsed JSON objects.  
You can filter files by prefix and/or suffix (e.g. only files starting with `deposit_data-` and ending with `.json`).

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

## 2. `get-subdirectories.js`

### Description
Scans a directory and returns a list of subdirectory names.

### Usage
```
const path = require('path');
const { GetSubdirectories } = require('/srv/stakersspace_utils/libs/filesystem-api.js');

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


## 4. `isLikelyFilePath`
## 5. `ensureDir`
## 6. `atomicWrite`
## 7. `resolveTargetPath`
## 8. `SaveJson`
## 9. `SaveJsonl`
## 10. `ReadJsonl`

---

### Installation
- Check the `filesystem-api.js` lib
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/libs/filesystem-api/filesystem-api.js
```
- Create `/srv/stakersspace_utils/libs` directory, if does not exist yet
```
sudo mkdir /srv/stakersspace_utils/libs
```
- Download the script to `/srv/stakersspace_utils/libs` directory
```
sudo curl -o /srv/stakersspace_utils/libs/filesystem-api.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/libs/filesystem-api/filesystem-api.js
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
sudo chown -R stakersspace:stakersspace /srv/stakersspace_utils/libs/filesystem-api.js
```