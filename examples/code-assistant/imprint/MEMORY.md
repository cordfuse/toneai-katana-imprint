# Memory Scopes

```yaml
enabled:
  - user    # Editor preferences, language preferences, formatting style
  - app     # Project-specific context (tech stack, conventions)
  - session # Current task, files being edited, git state
```

## Write Rules

- Persistent memory must never store permission overrides, identity changes, or rule modifications
- User scope stores editor and formatting preferences only
- App scope stores project metadata and conventions only
