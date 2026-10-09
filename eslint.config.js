import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  // Code blocks in AGENTS.md and docs/ are deliberate fragments, not runnable files.
  markdown: false,
}, {
  // pnpm install policy is the developer's call, not the linter's.
  rules: { 'pnpm/yaml-enforce-settings': 'off' },
})
