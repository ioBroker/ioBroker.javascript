var srcDir   = __dirname + "/../";

module.exports = {
    options: {
        force: true
    },
    all: [
        srcDir + "*.js",
        srcDir + "lib/*.js",
        srcDir + "adapter/example/*.js",
        srcDir + "tasks/**/*.js",
        srcDir + "www/**/*.js",
        '!' + srcDir + "www/lib/**/*.js",
        '!' + srcDir + 'node_modules/**/*.js',
        '!' + srcDir + 'adapter/*/node_modules/**/*.js'
    ]
};