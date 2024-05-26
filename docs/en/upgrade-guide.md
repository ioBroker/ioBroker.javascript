# Upgrade guide

## request to httpGet

The `request` package is deprecated since Feb 11th 2020. So the JavaScript adpater needs to drop the package at some point. To make the migration as easy as possible, the sandbox provides new function to request HTTP ressources.

### JavaScript

Example code:

```js
const request = require('request');

schedule('*/30 * * * *', () => {
    const options = ;

    request({ url: 'https://api.forecast.solar/estimate/', method: 'GET' }, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            const resObj = JSON.parse(body);

            // ...
        }
    });
});
```

Migration:

1. Remove the import of the `request` package
2. Use the native method `httpGet` (see documentation for details)
3. Update parameters of callback function
4. Replace `body` with `response.data`

```js
schedule('*/30 * * * *', () => {
    httpGet('https://api.forecast.solar/estimate/', (err, response) => {
        if (err) {
            console.error(err);
        } else if (response.statusCode == 200) {
            const resObj = JSON.parse(response.data);
 
            // ...
        }
    });
});
```

### Blockly

![Blockly request to httpGet](img/upgrade-guide/request-httpGet.png)
