const fs = require('fs').promises;
const path = require('path');

async function GetFilesContent(directoryPath, startsPrefix, endsPrefix, cb) {
    if (!directoryPath) {
        console.error("directoryPath parameter is required");
        cb("directoryPath parameter is required", null);
        return;
    }
    try {
        const files = await fs.readdir(directoryPath);
        let filesContent = {};
       
        for (const file of files) {
            if ((!startsPrefix && !endsPrefix) ||
                (startsPrefix && file.startsWith(startsPrefix) && !endsPrefix) ||
                (endsPrefix && file.endsWith(endsPrefix) && !startsPrefix) ||
                (startsPrefix && endsPrefix && file.startsWith(startsPrefix) && file.endsWith(endsPrefix))) {
                const filePath = path.join(directoryPath, file);
                try {
                    const data = await fs.readFile(filePath, 'utf8');
                    filesContent[file] = JSON.parse(data);
                } catch (readErr) {
                    console.log('Error reading or parsing file:', readErr);
                    return cb(readErr, null);
                }
            } else {
                console.log(`skipping "${file}" (It does not meet prefix conditions)`);
            }
        }
        cb(null, filesContent);
    } catch (err) {
        console.log('Unable to scan directory:', err);
        cb(err, null);
    }
}

module.exports = GetFilesContent;

/*var directoryPath = path.join(__dirname, '..', '..', 'get-validator-indexes/data/deposit_data');
GetFilesContent(directoryPath, 'deposit_data-', '.json', (err, content) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Files Content | keys:', Object.keys(content));
    }
});*/