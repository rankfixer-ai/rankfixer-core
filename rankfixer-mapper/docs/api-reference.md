# Mutation Engine API
- `applyDOMMutation(url, instruction, options)` — Apply surgical DOM change
- `rollbackMutation(url, instruction, beforeState)` — Revert using stored state
- `verifyMutationContext(document, instruction)` — Probe phase validation
## Supported Actions
add_element | add_meta_tag | update_title_template | update_meta_template
add_link_tag | update_canonical_target | break_reciprocal_canonical
update_h1 | consolidate_h1
