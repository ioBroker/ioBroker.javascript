const AWS = require('aws-sdk');
const fs = require('fs');
const sharp = require('sharp');

sharp(__dirname + '/Codeimage.jpg')
    .resize(400,100)
    .toFile('image.png');

/*
// initiate rekognition object with aws access_key, secret_key and region from environment variables
const rekognition = new AWS.Rekognition({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION
});

fs.readFile(__dirname + '/Codeimage.jpg', 'base64', (err, data) => {
    // create a new base64 buffer out of the string passed to us by fs.readFile()
    const buffer = new Buffer(data, 'base64');

    rekognition.detectModerationLabels({
        Image: {
            Bytes: buffer
        }
    }, function (err, data) {
        if (err) {
            console.log(err, err.stack);
        } else {
            console.log(JSON.stringify(data));
        }
    });
});*/
