// @ts-check
import prettier from 'eslint-config-prettier/flat'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: ['app/api/schema.d.ts'],
  },
  prettier,
)
