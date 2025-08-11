# JavaScript Utility to get validators snapshot for head state

## Prerequisites
- Synchronized and running beaconchain client with enabled API.

## Use
```
const getSnapshot = require('./getSnapshot');

(async () => {
    let beaconClientPort = 9596; // modify
    try {
        const json = await getSnapshot( beaconClientPort );
        console.log(json);
    } catch (err) {
        console.error('Error:', err.message);
    }
})();
```