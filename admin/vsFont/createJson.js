const fs = require('fs');
const data = fs.readFileSync(`${__dirname}/codicon.zip`, 'base64');
fs.writeFileSync(`${__dirname}/codicon.json`, JSON.stringify(data));
