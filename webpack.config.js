'use strict';

const path = require('path');

module.exports = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'examples'),
        filename: 'html-page-layout.js',
        library: ['HtmlPageLayout'],
        libraryTarget: 'umd'
    },
    devtool: 'source-map',
    devServer: {
        contentBase: path.join(__dirname, 'examples')
    }
};
