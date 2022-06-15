const CracoEsbuildPlugin = require('craco-esbuild');
const { ProvidePlugin/*, IgnorePlugin */} = require('webpack');
// const { ModuleFederationPlugin } = require('webpack').container;
// const deps = require('./package.json').dependencies;
const cracoModuleFederation = require('craco-module-federation');

console.log('craco');

module.exports = {
    plugins: [{ plugin: CracoEsbuildPlugin }, {
        plugin: cracoModuleFederation,
        // options: { useNamedChunkIds:true } //THIS LINE IS OPTIONAL
    }],
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
            // new HtmlWebpackPlugin(),
            new ProvidePlugin({
                React: 'react',
            }),
            // new ModuleFederationPlugin({
            //     name: 'iobroker_vis',
            //     filename: 'remoteEntry.js',
            //     remotes: {
            //     },
            //     exposes: {
            //         './visRxWidget': './src/Vis/visRxWidget',
            //     },
            //     shared:
            //     [
            //         'react', 'react-dom', '@mui/material', '@mui/styles', '@mui/icons-material', 'prop-types', '@iobroker/adapter-react-v5', 'react-ace',
            //     ],

            // }),
            // new IgnorePlugin({
            //     resourceRegExp: /myvisRxWidget/,
            // }),
        ],
        // configure: webpackConfig => {
        //     console.log(webpackConfig);
        //     //   webpackConfig.output.uniqueName = 'iobroker_vis';
        //     //   process.exit();
        //     return webpackConfig;
        // },
    },
};
