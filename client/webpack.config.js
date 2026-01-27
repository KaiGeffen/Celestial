const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = (_, argv) => {
  const isProd = argv.mode === 'production'

  const config = {
    entry: './src/app.ts',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
        },
      ],
    },
    mode: isProd ? 'production' : 'development',
    devtool: false, // Explicitly disable source maps to remove eval warning
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      alias: {
        path: require.resolve('path-browserify'),
      },
    },
    output: {
      libraryTarget: 'umd',
      filename: isProd ? '[name].[contenthash].js' : '[name].js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
    },
    optimization: isProd
      ? {
          minimize: true,
          minimizer: [
            new TerserPlugin({
              terserOptions: {
                compress: {
                  drop_console: true,
                  dead_code: true,
                },
              },
            }),
          ],
          splitChunks: {
            chunks: 'all',
            maxSize: 500000,
            cacheGroups: {
              phaser: {
                test: /[\\/]node_modules[\\/](phaser|phaser3-rex-plugins)[\\/]/,
                name: 'phaser',
                chunks: 'all',
                priority: 20,
              },
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendor',
                chunks: 'all',
                priority: 10,
              },
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 5,
                reuseExistingChunk: true,
              },
            },
          },
        }
      : {},
    plugins: [
      new HtmlWebpackPlugin({
        title: 'Caching',
        template: 'template.html',
        filename: '../index.html',
        scriptLoading: 'defer',
      }),
    ],
    performance: {
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
  }

  if (!isProd) {
    config.devServer = {
      headers: {
        'Access-Control-Allow-Origin': '216.193.175.49',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Headers': '*',
      },
    }
  }

  return config
}
