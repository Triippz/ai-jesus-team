# commands

Slash command definitions for the core-superpowers plugin.

13 commands mapping to workflow skills. Each is a thin wrapper with `disable-model-invocation: true` — all logic lives in skills, never in commands.

The full set: `/brainstorm`, `/spec`, `/write-plan`, `/tdd`, `/execute-plan`, `/debug`, `/review`, `/verify`, `/finish`, `/mr`, `/resolve-reviews`, `/plan-to-jira`, `/update-jira`.

`/spec` is the heavier-weight spec-driven-development pipeline (3 deterministic modes: new, import, amend). See `skills/spec-driven-development/SKILL.md` for the full process.
