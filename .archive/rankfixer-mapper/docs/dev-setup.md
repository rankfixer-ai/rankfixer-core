# Development Setup
- **Node.js**: v18+ (built-in fetch, ES modules)
- **Database**: PostgreSQL (JSONB support)
- **Zero npm dependencies**
## Run Tests
`node test-v2.js`
## Adding New Rules
1. Add handler to `mutation-engine.js` (Probe-and-Patch)
2. Add to `buildFixInstruction()` in `rankfixer-bridge.js`
3. Update `isAutoFixable()` whitelist
4. Update `GOVERNANCE.md` if scoring changes
5. Dry run before enabling
