# hooks

Safety hook scripts for the core-superpowers plugin.

12 bash scripts that enforce git policy, protect sensitive files, block destructive operations, detect secrets, and guard infrastructure. Configuration in `hooks.json`.

Test with: `echo '{"tool_input":{"command":"..."}}' | hooks/<script>.sh`
