const { merge } = require('webpack-merge');
const common = require('./webpack.common.cjs');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CSPAuditPlugin = require('./plugins/CSPAuditPlugin.cjs');

module.exports = (env) => merge(common, {
  mode: 'production',
  devtool: 'source-map',

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          },
          format: {
            comments: false
          }
        },
        extractComments: false
      })
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 10
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  },

  plugins: [
    // CSP Compliance Audit
    new CSPAuditPlugin({
      enabled: !env?.nocsp, // Can be disabled with --env nocsp
      failOnError: true,
      reportPath: 'csp-audit-report.json',
      distPath: 'dist'
    }),

    // Bundle analyzer (optional)
    ...(process.argv.includes('--analyze') ? [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: true
      })
    ] : [])
  ]
});
