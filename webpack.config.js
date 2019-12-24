const path = require("path");

module.exports = {
  module: {
    rules: [
      {
        test: /\.js/,
        exclude: path.resolve(__dirname, "./node_modules/"),
        use: {
          loader: "babel-loader",
          options: {
            presets: [["@babel/preset-env"]],
            plugins: [
              ["@babel/plugin-proposal-class-properties", { loose: false }],
              "@babel/plugin-syntax-dynamic-import",
              "@babel/plugin-transform-runtime"
            ]
          }
        }
      }
    ]
  }
};
