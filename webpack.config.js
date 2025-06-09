const path = require('path');

module.exports = [
  // 主扩展入口
  {
    target: 'node', // VS Code扩展运行在Node.js环境
    mode: 'none', // 由npm scripts控制模式

    entry: './src/extension.ts', // 扩展入口文件
    output: {
      path: path.resolve(__dirname, 'out'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2'
    },
    externals: {
      vscode: 'commonjs vscode' // VS Code API不打包
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'esbuild-loader',
              options: {
                loader: 'ts',
                target: 'es2020'
              }
            }
          ]
        }
      ]
    },
    devtool: 'nosources-source-map',
    infrastructureLogging: {
      level: "log", // 启用webpack日志
    },
  },
  // Worker线程
  {
    target: 'node',
    mode: 'none',
    entry: './src/workers/worker-thread.ts',
    output: {
      path: path.resolve(__dirname, 'out/workers'),
      filename: 'worker-thread.js',
      libraryTarget: 'commonjs2'
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'esbuild-loader',
              options: {
                loader: 'ts',
                target: 'es2020'
              }
            }
          ]
        }
      ]
    },
    devtool: 'nosources-source-map',
    infrastructureLogging: {
      level: "log",
    },
  }
]; 