const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    port: 8080
  },
  chainWebpack: (config) => {
    if (process.env.NODE_ENV === 'production' && process.env.BUILD_TARGET === 'library') {
      config.entry('app').clear().add('./src/index.js')
      config.externals({
        vue: {
          commonjs: 'vue',
          commonjs2: 'vue',
          amd: 'vue',
          root: 'Vue'
        }
      })
    }
  }
})