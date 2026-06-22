# Obsidian Community Plugin submission notes

Suggested repository name:

```text
device-plugin-switcher
```

Suggested initial release tag:

```text
1.0.0
```

Suggested community directory description:

```text
Choose which community plugins are enabled on desktop, mobile, both, or disabled.
```

Important disclosure for review:

```text
This plugin changes the active state of other community plugins. It uses Obsidian's internal plugin manager because Obsidian does not currently provide a stable public API specifically for enabling/disabling other community plugins. The plugin does not use telemetry, network requests, Node.js filesystem APIs, or Electron APIs.
```

Release assets that must be attached to the GitHub release:

```text
main.js
manifest.json
styles.css
```
