        import globals from "globals";
        import pluginJs from "@eslint/js";
        import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
        import { fixupConfigRules } from "@eslint/compat";

        export default [
          {
            files: ["**/*.{js,mjs,cjs,jsx}"],
            languageOptions: {
              parserOptions: {
                ecmaFeatures: {
                  jsx: true,
                },
              },
              globals: globals.browser,
            },
          },
          pluginJs.configs.recommended,
          ...fixupConfigRules(pluginReactConfig),
          {
            rules: {
              "react/react-in-jsx-scope": "off", // Not needed with React 17+ JSX transform
              "react/jsx-uses-react": "off",     // Not needed with React 17+ JSX transform
            },
          },
        ];
        