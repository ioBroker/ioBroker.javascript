// you can use this file to add your custom webpack plugins, loaders and anything you like.
// This is just the basic way to add additional webpack configurations.
// For more information refer the docs: https://storybook.js.org/configurations/custom-webpack-config

// IMPORTANT
// When you add this file, we won't add the default configurations which is similar
// to "React Create App". This only has babel loader to load JavaScript.

var path = require("path");
var root = path.join(__dirname, "..");
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var webpack = require('webpack');

module.exports = {
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
    ],
  },
    resolve: {
        modules: [
            'node_modules',
            path.join(root, 'src')
        ],
        extensions: ['.js', '.styl', '.css']
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('production')
            }
        }),
        new ExtractTextPlugin('bundle.css')
    ],
};
