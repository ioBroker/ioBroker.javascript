const webpack = require('webpack'),
    ExtractTextPlugin = require('extract-text-webpack-plugin'),
    path = require('path');

module.exports = {
    context: __dirname,
    entry: './src/index.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bundle.js',
        libraryTarget: 'umd',
        library: 'react-cron-builder',
        publicPath: '/dist/'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: [/node_modules/],
                use: 'babel-loader'
            },
            {
                test: /\.styl$/,
                use: ExtractTextPlugin.extract(['css-loader', 'stylus-loader'])
            },
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract(['css-loader'])
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('production')
            }
        }),
        new ExtractTextPlugin('bundle.css')
    ],
    resolve: {
        modules: [
            'node_modules',
            path.join(__dirname, 'src')
        ],
        extensions: ['.js', '.styl', '.css']
    },
    externals: {
        react: 'react',
        'react-dom': 'react-dom',
        lodash: 'lodash',
        'prop-types': 'prop-types'
    }
};
