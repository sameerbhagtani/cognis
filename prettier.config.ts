import type { Config } from "prettier";

const config: Config = {
    printWidth: 100,
    tabWidth: 4,

    semi: true,
    singleQuote: false,
    jsxSingleQuote: false,

    trailingComma: "all",
    arrowParens: "always",

    endOfLine: "lf",
};

export default config;
