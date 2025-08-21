'use strict';
const http = require('http');
function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let response = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { response += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode}: ${response.slice(0, 200)}`));
        }
        resolve(response);
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(new Error('Request timeout')); });

    if (body) req.write(body);
    req.end();
  });
}

async function getSnapshot(beaconPort = 9596, pubIdsList = null, statuses = null) {
   console.log(' Processing validators snapshot for head slot state | statuses filter:', statuses);

	let apiPath = '/eth/v1/beacon/states/head/validators';
	if(pubIdsList) apiPath+='?id='+pubIdsList.toString();
  if(statuses) apiPath+= (pubIdsList) ? '&' : '?' + 'status='+statuses.toString();
  
   const data = await httpRequest({
      hostname: 'localhost',
      port: beaconPort,
      path: apiPath,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
   }, null);

  return JSON.parse(data);
}

module.exports = getSnapshot;