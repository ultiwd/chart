const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  output: {
    path: __dirname + "/public"
  },
  module: {
    rules: [
      {
        test: /\.js/,
        exclude: path.resolve(__dirname, "./node_modules/"),
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    "browsers": ["> 1%", "last 2 versions", "Android >= 3.2", "not ie <= 8"]
                  },
                  useBuiltIns: true
                }
              ]
            ],
            plugins: [
              ["@babel/plugin-proposal-class-properties", { loose: false }],
              "@babel/plugin-syntax-dynamic-import",
              "@babel/plugin-transform-runtime"
            ]
          }
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./index.html"
    })
  ]
};
