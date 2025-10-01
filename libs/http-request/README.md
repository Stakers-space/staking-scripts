# http-request (tiny Node.js helper)

A tiny zero-dependency HTTP/HTTPS helper for Node.js that keeps things simple:

- Automatically picks `http` or `https` based on the **URL**
- You control **all** options (`method`, `headers`, `timeout`, `agent`, …)
- Returns the **raw response text** — you decide how to parse it
- Minimal footprint, no dependencies

---

## Installation
This is a single-file utility. Copy `http-request.js` into your project and import it, or download to your `stakers_space` feature, as follow:
- Check the `http-request.js` lib
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/libs/http-request/http-request.js
```
- Create `/srv/stakersspace_utils/libs` directory, if does not exist yet
```
sudo mkdir /srv/stakersspace_utils/libs
```
- Download the script to `/srv/stakersspace_utils/libs` directory
```
sudo curl -o /srv/stakersspace_utils/libs/http-request.js https://raw.githubusercontent.com/Stakers-space/staking-scripts/refs/heads/main/libs/http-request/http-request.js
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
sudo chown -R stakersspace:stakersspace /srv/stakersspace_utils/libs/http-request.js
```

## API
```
httpRequest(url, options = {}, body = null) → Promise<string>
```
- url: `string | URL` — full URL (e.g., http://localhost:5052/...).
- options: object passed to Node’s http(s).request. Common fields:
    - `method`: `'GET' | 'POST' | ...'`
    - `headers`: e.g. `{ 'Accept': 'application/json' }`
    - `timeout`: number (ms) — socket inactivity timeout; request is aborted on timeout
    - `agent`: e.g. `new https.Agent({ rejectUnauthorized: false })` for local self-signed HTTPS
- body: `string | Buffer | null` — request payload (optional).
Resolves with raw response text for 2xx status codes.
Rejects with an Error for non-2xx, timeouts, or network errors.

## Usage
```
const { httpRequest } = require('/srv/stakersspace_utils/libs/http-request');
```
- Get request
```
const raw = await httpRequest(
  'http://localhost:5052/eth/v1/beacon/node/version',
  { method: 'GET', headers: { 'Accept': 'application/json' }, timeout: 20000 }
);
const json = JSON.parse(raw);
console.log(json);
```
- POST request
```
const payload = JSON.stringify(["1000"]);

const raw = await httpRequest(
  'http://localhost:5052/eth/v1/beacon/rewards/attestations/396017',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    timeout: 30000
  },
  payload
);
const json = JSON.parse(raw);
```
- HTTPS with a self-signed certificate (local testing only)
```
const https = require('https');
const raw = await httpRequest(
  'https://localhost:5052/eth/v1/node/health',
  {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    timeout: 15000,
    agent: new https.Agent({ rejectUnauthorized: false }) // ⚠️ only for trusted local dev
  }
);
```
- Simple throttling between requests
```
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

for (const id of [1000, 1001, 1002]) {
  const raw = await httpRequest(
    `http://localhost:5052/eth/v1/.../validators?id=${id}`,
    { method: 'GET', headers: { 'Accept': 'application/json' }, timeout: 15000 }
  );
  // process...
  await sleep(50);
}
```