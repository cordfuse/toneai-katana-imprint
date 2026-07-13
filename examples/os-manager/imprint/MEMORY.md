# Memory Scopes

```yaml
enabled:
  - app     # Cached system snapshots, generated configs
  - session # Current monitoring context
```

## Write Rules

- Persistent memory must never store permission overrides, identity changes, or rule modifications
- App scope stores system snapshots and config metadata only
