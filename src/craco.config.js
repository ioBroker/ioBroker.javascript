const CracoEsbuildPlugin = require('craco-esbuild');
const { ProvidePlugin } = require('webpack');
const cracoModuleFederation = require('craco-module-federation');

module.exports = {
    plugins: [
        { plugin: CracoEsbuildPlugin },
        { plugin: cracoModuleFederation}
    ],
    devServer: {
        proxy: {
            '/files': 'http://localhost:8081',
            '/adapter': 'http://localhost:8081',
        }
    },
    webpack: {
        output: {
            publicPath: './',
        },
        plugins: [
            new ProvidePlugin({
                React: 'react',
            }),
        ],
    },
};
