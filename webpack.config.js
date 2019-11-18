const defaultConfig = require('@open-wc/building-webpack/modern-config')
const merge = require('webpack-merge')
const path = require('path')

const config = merge(
  defaultConfig({
    input: path.resolve(__dirname, 'src/index.html'),
    plugins: {
      workbox: false
    }
  }),
  {
    devServer: {
      hot: false
    },
    output: {
      path: path.resolve(__dirname, 'dist')
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: 'css-loader'
        },
        {
          test: /\.svg$/,
          use: [
           {
             loader: 'svg-inline-loader',
             options: {
              removeSVGTagAttrs: false
            }
           },
          ],
        },
        {
          test: /\.(gif|png|jpe?g)$/i,
          use: 'url-loader',
        }
      ]
    }
  }
)

module.exports = config