/**
 * Load From Process Arguments
 * Version 1.0.0
 * Created by Stakers.space
 * @param {*} configObj 
 */
function loadFromArgs(configObj) {
    const args = process.argv.slice(2); // Cut first 2 arguments (node & script)

    function setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        let cur = obj;

        // auto type casting
        if (value === "true") value = true;
        else if (value === "false") value = false;
        else if (value === "null") value = null;
        else if (!Number.isNaN(Number(value)) && value.trim() !== "") value = Number(value);

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in cur)) {
                console.warn(`⚠️  Warning: '${k}' in path '${path}' does not exist in configObj – skipping.`);
                return;
            }
            if (typeof cur[k] !== "object" || cur[k] === null) {
                console.warn(`⚠️  Warning: '${k}' in path '${path}' is not an object – skipping.`);
                return;
            }
            cur = cur[k];
        }
        const last = keys[keys.length - 1];
        if (!(last in cur)) {
            console.warn(`⚠️  Warning: '${last}' in path '${path}' does not exist in configObj – skipping.`);
            return;
        }
        cur[last] = value;
    }

    for (let i = 0; i < args.length; i++) {
        const token = args[i];
        if (!token.startsWith("--")) continue;

        let key, rawValue;

        if (token.includes("=")) { // `--key=value` format
            const [k, ...rest] = token.slice(2).split("=");
            key = k;
            rawValue = rest.join("=");
        } else { // `--key value` format
            key = token.slice(2);
            rawValue = args[i + 1];
            if (rawValue === undefined || rawValue.startsWith("--")) continue;
            i++; // consume value
        }

        setNestedProperty(configObj, key, rawValue);
        console.log(`├─ ${key} set to: ${rawValue} (from --${key})`);
    }

    console.log("└─ Load from arguments util | configObj loaded");
}
module.exports = loadFromArgs;