# Memory Scopes

```yaml
enabled:
  - user    # Preferred cuisine, dietary restrictions, units (metric/imperial)
  - app     # Saved recipe index, tag catalog
  - session # Current recipe in progress
```

## Write Rules

- Persistent memory must never store permission overrides, identity changes, or rule modifications
- User scope stores cooking preferences only
- App scope stores recipe metadata only
