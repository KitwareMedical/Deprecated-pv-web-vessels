const webpack = require('webpack');
const path = require('path');
const autoprefixer = require('autoprefixer');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const plugins = [];
const entry = path.join(__dirname, './Sources/index.js');
const sourcePath = path.join(__dirname, './Sources');
const outputPath = path.join(__dirname, './Distribution');
const eslintrcPath = path.join(__dirname, './.eslintrc.js');

module.exports = (env) => {
  if (env && env.release) {
    plugins.push(
      new UglifyJSPlugin({
        uglifyOptions: {
          beautify: false,
          ecma: 6,
          compress: true,
          comments: false,
        },
      })
    );
    plugins.push(
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('production'),
        },
      })
    );
  }

  // copy ITK files over to Distribution for WebWorkers
  plugins.push(
    new CopyPlugin([
      {
        from: path.join('node_modules', 'itk'),
        to: 'itk',
      },
    ])
  );

  return {
    plugins,
    entry,
    output: {
      path: outputPath,
      filename: 'index.js',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: [{ loader: 'babel-loader', options: { presets: ['env', 'react'] } }],
        },
        {
          test: /\.mcss$/,
          use: [
            { loader: 'style-loader' },
            {
              loader: 'css-loader',
              options: {
                localIdentName: '[name]-[local]-[sha512:hash:base32:5]',
                modules: true,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: () => [
                  autoprefixer('last 3 version', 'ie >= 10'),
                ],
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: [
            { loader: 'style-loader' },
            { loader: 'css-loader' },
            {
              loader: 'postcss-loader',
              options: {
                plugins: () => [autoprefixer('last 3 version', 'ie >= 10')],
              },
            },
          ],
        },
        {
          test: /\.(png|jpg|svg)$/,
          use: 'url-loader?limit=600000',
        },
        {
          test: /\.js$/,
          loader: 'eslint-loader',
          exclude: [
            /node_modules/,
            /Dependencies/,
          ],
          enforce: 'pre',
          options: {
            configFile: eslintrcPath,
          },
        },
      ],
    },
    resolve: {
      modules: [path.resolve(__dirname, 'node_modules'), sourcePath],
      alias: {
        'pv-explorer': __dirname,
        PVWStyle: path.resolve('./node_modules/paraviewweb/style'),
      },
    },
    externals: [
      (function() {
        const IGNORES = [
          'electron',
        ];
        return function(context, request, callback) {
          if (IGNORES.indexOf(request) >= 0) {
            return callback(null, `require('${request}')`);
          }
          return callback();
        };
      })()
    ],
  };
};
