const HtmlWebpackPlugin = require('html-webpack-plugin');
const InlineChunkHtmlPlugin = require('react-dev-utils/InlineChunkHtmlPlugin');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',

    // This is necessary because Figma's 'eval' works differently than normal eval
    devtool: argv.mode === 'production' ? false : 'inline-source-map',

    entry: {
      ui: './src/app/index.tsx', // The entry point for your UI code
      code: './src/feature/controller.ts', // The entry point for your plugin code
    },

    module: {
      rules: [
        // Converts TypeScript code to JavaScript
        { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },

        // Enables including CSS by doing "import './file.css'" in your TypeScript code
        { test: /\.css$/, use: ['style-loader', { loader: 'css-loader' }] },

        // Allows you to use "<%= require('./file.svg') %>" in your HTML code to get a data URI
        { test: /\.(png|jpg|gif|webp|svg)$/, loader: 'url-loader' },
      ],
    },

    // Webpack tries these extensions for you if you omit the extension like "import './file'"
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js']
    },

    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist'), // Compile into a folder called "dist"
    },

    // Tells Webpack to generate "ui.html" and to inline "ui.ts" into it
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/app/index.html',
        filename: 'ui.html',
        chunks: ['ui'],
        cache: false,
      }),
      new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/ui/]),
      ...(isProduction
        ? [
          new BundleAnalyzerPlugin({
            analyzerMode: 'static', // 生成静态 HTML 文件
            openAnalyzer: true, // 自动打开分析报告
          }),
        ]
        : []),
    ],

    optimization: {
      minimize: isProduction,
      minimizer: isProduction
        ? [
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true, // 移除所有 console 语句
              },
            },
          }),
        ]
        : [],
    },
  };
};
