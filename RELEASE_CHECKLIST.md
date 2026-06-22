# Release checklist

## Before creating a GitHub release

- [ ] `manifest.json` version is `x.y.z`.
- [ ] `package.json` version matches `manifest.json`.
- [ ] `versions.json` contains the current version and `minAppVersion`.
- [ ] `README.md` explains what the plugin does and how to use it.
- [ ] `LICENSE` exists.
- [ ] `npm install` completed.
- [ ] `npm run build` passes.
- [ ] Manual test on desktop completed.
- [ ] Manual test on mobile completed.
- [ ] Confirm plugin ID does not contain `obsidian`.

## Create release

Use a tag that exactly matches `manifest.json` version:

```bash
git tag 1.0.0
git push origin 1.0.0
```

The release workflow uploads:

```text
main.js
manifest.json
styles.css
```

## Submit to Obsidian Community directory

1. Go to https://community.obsidian.md
2. Sign in with your Obsidian account.
3. Link GitHub.
4. Go to **Plugins → New plugin**.
5. Submit the public GitHub repository URL.
6. Address automated review feedback if any.
