const { merge } = require('webpack-merge');
const common = require('./webpack.common.cjs');
const CSPAuditPlugin = require('./plugins/CSPAuditPlugin.cjs');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',

  optimization: {
    minimize: false,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 10
        }
      }
    }
  },

  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 300,
    poll: 1000
  },

  plugins: [
    // CSP Compliance Audit (warnings only in dev)
    new CSPAuditPlugin({
      enabled: true,
      failOnError: false, // Don't fail builds in development
      reportPath: 'csp-audit-report.json',
      distPath: 'dist',
      watchMode: true
    })
  ]
});
