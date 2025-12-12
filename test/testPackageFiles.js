const path = require('node:path');
const { tests } = require('@iobroker/testing');

// Validate the package files
tests.packageFiles(path.join(__dirname, '..'));
