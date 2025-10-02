'use strict';
const VERSION = '1.0.0';
const fs  = require('fs');
const fsp = require('fs/promises');
const path = require('path');


/** Naive check if string looks like a file path (has an extension). */
function isLikelyFilePath(p) { return /\.[a-z0-9]+$/i.test(String(p || ''));}

/** Ensure directory exists (mkdir -p). */
async function ensureDir(dir) { await fsp.mkdir(dir, { recursive: true });}

/** Atomic write: write to temp file, then rename into place. */
async function atomicWrite(filePath, content) {
    const tmp = `${filePath}.tmp.${Date.now()}`;
    await fsp.writeFile(tmp, content);
    await fsp.rename(tmp, filePath);
}

/**
 * Resolve final target path:
 * - If outPath is empty → use ./<filename>
 * - If outPath looks like a directory (no extension) → join with <filename>
 * - If outPath looks like a file → return as-is (ensure parent dir)
 */
async function resolveTargetPath(outPath, filename) {
    let targetPath = outPath || '';
    if (!targetPath) {
        targetPath = path.join(process.cwd(), filename);
    } else if (!isLikelyFilePath(targetPath)) {
        const dir = targetPath.replace(/\/+$/, '');
        await ensureDir(dir);
        targetPath = path.join(dir, filename);
    } else {
        await ensureDir(path.dirname(targetPath));
    }
    return targetPath;
}

/**
 * SaveJson: write a JSON value to disk (object/array → stringify; string → write as-is).
 *
 * @param {Object} opts
 * @param {string}   [opts.outPath=""]   File path or directory. If directory/empty, `filename` is required.
 * @param {string}   [opts.filename=""]  Required if `outPath` is empty or a directory.
 * @param {any}      opts.json           JSON value (object/array/string). If string, written verbatim.
 * @param {boolean}  [opts.atomic=true]  Use atomic write.
 * @param {number}   [opts.space=0]      JSON.stringify space (0 = compact). Ignored if `json` is a string.
 * @returns {Promise<string>}            Final saved file path.
 */
async function SaveJson({ outPath = '', filename = '', json, atomic = true, space = 0 }) {
    if (json === undefined) throw new Error('SaveJson: `json` is required');

    // Decide final path
    if (!outPath || !isLikelyFilePath(outPath)) {
        if (!filename) throw new Error('SaveJson: `filename` is required when `outPath` is empty or a directory');
    }
    const targetPath = await resolveTargetPath(outPath, filename);

    // Prepare payload
    let payload;
    if (typeof json === 'string') {
        // Write string verbatim (assumed to be valid JSON already if you care)
        payload = json.endsWith('\n') ? json : json + '\n';
    } else {
        // Stringify object/array
        payload = JSON.stringify(json, null, space) + '\n';
    }

    if (atomic) await atomicWrite(targetPath, payload);
    else await fsp.writeFile(targetPath, payload);

    return targetPath;
}

/**
 * SaveJsonl: writes your pre-built JSONL lines verbatim.
 * `lines` must be an array of strings; function adds a trailing newline.
 *
 * @param {Object} opts
 * @param {string} opts.outPath   File path OR directory path
 * @param {string} [opts.filename] Required when outPath is a directory
 * @param {string[]} opts.lines   Array of JSON strings (one per line), e.g. [JSON.stringify(envelope), ...rows]
 * @param {boolean} [opts.atomic=true]
 * @returns {Promise<string>} final file path
 */
async function SaveJsonl({ outPath, filename, lines, atomic = true }) {
  if (!outPath) throw new Error('SaveJsonl: outPath is required');
  if (!Array.isArray(lines)) throw new Error('SaveJsonl: lines must be an array of strings');

  let target = outPath;
  if (!isLikelyFilePath(outPath)) {
    if (!filename) throw new Error('SaveJsonl: filename is required when outPath is a directory');
    const dir = outPath.replace(/\/+$/, '');
    await ensureDir(dir);
    target = path.join(dir, filename);
  } else {
    await ensureDir(path.dirname(outPath));
  }

  // Join lines and ensure a trailing newline
  const payload = lines.join('\n') + '\n';
  if (atomic) await atomicWrite(target, payload);
  else await fs.writeFile(target, payload);

  return target;
}

/**
 * Read JSONL with a simple heuristic:
 * - If there are at least 2 lines and Object.keys(line0) !== Object.keys(line1),
 *   treat line 0 as the envelope. Otherwise, no envelope.
 * - Throws on invalid JSON.
*/
function ReadJsonl(filePath) {
    const text = fs.readFileSync(filePath, 'utf8')
        .split('\n').map(s => s.trim()).filter(Boolean);

    if (text.length === 0) return { envelope: null, rows: [] };

    const first = JSON.parse(text[0]);
    if (text.length === 1) return { envelope: null, rows: [first] };

    const second = JSON.parse(text[1]);
    const k0 = Object.keys(first).sort().join(',');
    const k1 = Object.keys(second).sort().join(',');
    const hasEnvelope = (k0 !== k1);

    const rows = (hasEnvelope ? text.slice(1) : text).map(l => JSON.parse(l));
    return { envelope: hasEnvelope ? first : null, rows };
}


async function GetSubdirectories(directory) {
    console.log("getSubdirectories in",directory);
    try {
        const files = await fsp.readdir(directory, { withFileTypes: true });
        const subdirs = files
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        return subdirs;
    } catch (err) {
        console.error(`Error reading directory: ${err.message}`);
        return [];
    }
}

async function GetFilesContent(directoryPath, startsPrefix, endsPrefix, cb) {
    if (!directoryPath) {
        console.error("directoryPath parameter is required");
        cb("directoryPath parameter is required", null);
        return;
    }
    try {
        const files = await fsp.readdir(directoryPath);
        let filesContent = {};
       
        for (const file of files) {
            if ((!startsPrefix && !endsPrefix) ||
                (startsPrefix && file.startsWith(startsPrefix) && !endsPrefix) ||
                (endsPrefix && file.endsWith(endsPrefix) && !startsPrefix) ||
                (startsPrefix && endsPrefix && file.startsWith(startsPrefix) && file.endsWith(endsPrefix))) {
                const filePath = path.join(directoryPath, file);
                try {
                    const data = await fsp.readFile(filePath, 'utf8');
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


module.exports = {
    VERSION,
    isLikelyFilePath,
    ensureDir,
    atomicWrite,
    resolveTargetPath,
    SaveJson,
    SaveJsonl,
    ReadJsonl,
    GetSubdirectories,
    GetFilesContent
};
