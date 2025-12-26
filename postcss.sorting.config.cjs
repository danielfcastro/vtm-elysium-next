module.exports = {
  map: false,
  plugins: [
    require("postcss-sorting")({
      order: [
        "custom-properties",
        "dollar-variables",
        "declarations",
        "at-rules",
        "rules",
      ],
      "properties-order": "alphabetical",
    }),
  ],
};
