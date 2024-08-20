const fs = require('fs').promises;
const path = require('path');

async function GetSubdirectories(directory) {
    console.log("getSubdirectories in",directory);
    try {
        const files = await fs.readdir(directory, { withFileTypes: true });
        const subdirs = files
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        return subdirs;
    } catch (err) {
        console.error(`Error reading directory: ${err.message}`);
    }
}

module.exports = GetSubdirectories;

/*
const directoryPath = path.join(__dirname, '..', '..', 'get-validator-indexes/data/deposit_data');
GetSubdirectories(directoryPath).then(subdirs => {
    console.log('Subdirectories:', subdirs);
});
*/