module.exports = {
  publicPath: "/bfe2/editor/",
  devServer: {
    disableHostCheck: true,
    proxy: "https://data.bibframe.app",
  },
};
