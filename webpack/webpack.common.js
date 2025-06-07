const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const srcDir = path.join(__dirname, '..', 'src');
const publicDir = path.join(__dirname, '..', 'public');
const distDir = path.join(__dirname, '..', 'dist');

module.exports = {
  entry: {
    background: path.join(srcDir, 'background', 'index.ts'),
    content: path.join(srcDir, 'content', 'index.ts'),
    popup: path.join(srcDir, 'popup', 'index.tsx'),
    options: path.join(srcDir, 'options', 'index.tsx')
  },

  output: {
    path: distDir,
    filename: '[name].js',
    clean: true
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.s?css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]'
        }
      }
    ]
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': srcDir,
      '@background': path.join(srcDir, 'background'),
      '@content': path.join(srcDir, 'content'),
      '@popup': path.join(srcDir, 'popup'),
      '@options': path.join(srcDir, 'options'),
      '@shared': path.join(srcDir, 'shared'),
      '@assets': path.join(srcDir, 'assets')
    }
  },

  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: publicDir, to: distDir },
        {
          from: path.join(srcDir, 'assets', 'icons', '**/*'),
          to: path.join(distDir, 'icons'),
          globOptions: {
            dot: false,
            ignore: ['**/.DS_Store']
          },
          noErrorOnMissing: true
        }
      ]
    }),

    new HtmlWebpackPlugin({
      template: path.join(srcDir, 'popup', 'index.html'),
      filename: 'popup.html',
      chunks: ['popup']
    }),

    new HtmlWebpackPlugin({
      template: path.join(srcDir, 'options', 'index.html'),
      filename: 'options.html',
      chunks: ['options']
    }),

    new MiniCssExtractPlugin({
      filename: '[name].css',
      runtime: false // Chrome extension specific: disable runtime for popup compatibility
    })
  ]
};
