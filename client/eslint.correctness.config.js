import globals from 'globals';
export default [{
    files:['src/**/*.{js,jsx}'],
    languageOptions:{ecmaVersion:'latest',sourceType:'module',globals:globals.browser,parserOptions:{ecmaFeatures:{jsx:true}}},
    rules:{'no-undef':'error','no-dupe-args':'error','no-dupe-keys':'error','no-unreachable':'error','constructor-super':'error','valid-typeof':'error','no-unsafe-optional-chaining':'error','no-async-promise-executor':'error','no-promise-executor-return':'error'}
}];
