# Release preparation

1. Complete the manual checks in the README in a disposable vault on supported desktop and mobile versions.
2. Check the [Obsidian plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines) and [submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin).
3. Recheck name and ID availability in community-plugins.json and pending submissions. IDs must stay unique; do not reuse bases-amount-formatter.
4. Update package.json, package-lock.json, manifest.json, versions.json and CHANGELOG.md consistently.
5. Run `npm ci` and `npm run check`, then commit with signing enabled and verify the signature.
6. Push a signed tag matching manifest.version exactly, for example `git tag -s 0.1.0 -m 'Release 0.1.0'`. Obsidian release tags do not have a v prefix.
7. The workflow builds and tests, then creates a **draft** GitHub release containing main.js, manifest.json and styles.css. Review the assets and publish manually.
8. Only after publishing and testing the release, submit the repository to the community registry.

The manifest currently targets Obsidian 1.15.0 because that is the version used for the initial technical probe. Lower the minimum only after testing the relevant APIs. Mobile support is intended (no desktop APIs in runtime code) but has not yet been verified.
