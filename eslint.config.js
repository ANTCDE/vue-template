import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
}, {
  // pnpm install policy is the developer's call, not the linter's.
  rules: { 'pnpm/yaml-enforce-settings': 'off' },
})
