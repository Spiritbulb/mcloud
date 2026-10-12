# @mcloud/liquid

The Liquid engine (`liquidjs`) and the bundled storefront theme templates.

- Templates: `themes/<theme>/{templates,sections,snippets}/*.liquid`
- **`src/themes-manifest.ts` is generated** from those files and committed. The storefront
  renders from the manifest, not the disk. After editing any `.liquid` file run:

  ```sh
  npm run gen:manifest -w @mcloud/liquid
  ```

  `src/manifest-sync.test.ts` fails if you forget.
- `renderTemplate(key, context)` renders one template, e.g. `classic/sections/hero`.
- Editable regions: snippets such as `editable`, `editable-item` and `record-anchor` emit the
  `data-mcloud-*` attributes the Editor's click-to-edit uses (only when `store.editing`).

Tests: `npm test -w @mcloud/liquid`.
