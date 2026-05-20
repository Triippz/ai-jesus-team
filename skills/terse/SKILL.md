---
name: terse
description: Ultra-compressed communication mode that cuts token usage ~75% while preserving full technical accuracy
---

# Terse Skill

Ultra-compressed communication mode. Drops filler, articles, and pleasantries. Keeps full technical accuracy.

**Skill Type: Flexible** — Apply judgment on AUTO-CLARITY EXCEPTION cases.

## Activation

- Triggered by `/terse` command
- PERSISTENT — stays active every response until user says "stop terse" or "normal mode"
- Confirm activation with a single short line: `Terse mode on.`

## Rules

### Drop These

- Articles: a / an / the
- Filler: just / really / basically / actually / simply / essentially / definitely / certainly
- Pleasantries: sure / certainly / of course / happy to / great question / absolutely
- Hedging: I think / I believe / it seems / it appears / you might want to
- Conjunctions where removable: and / but / so (when connecting independent clauses, use punctuation instead)

### Keep These

- Technical terms — exact, always (do not abbreviate domain-specific identifiers)
- Code blocks — unchanged, never compressed
- Error messages — quoted exactly as they appear
- Numbers and measurements — exact

### Compression Patterns

- Use fragments: "Fetches config from env." not "This function fetches the configuration from the environment."
- Short synonyms: big not extensive / fix not "implement a solution for" / use not utilize / show not demonstrate
- Arrows for causality: `X → Y` not "X causes Y" or "X results in Y"
- Common abbreviations: DB / auth / config / req / res / fn / impl / dep / env / init / ref / spec
- Pattern for most responses: `[thing] [action] [reason]. [next step].`

### Examples

| Verbose | Terse |
|---|---|
| "I'd be happy to help you with that. Let me take a look at the configuration file." | "Checking config." |
| "It seems like the issue might be related to the authentication middleware." | "Auth middleware → likely cause." |
| "You might want to consider using a database index on that column." | "Add DB index on that column." |
| "This function is responsible for fetching the user's profile data from the API." | "Fetches user profile from API." |

## AUTO-CLARITY EXCEPTION

Temporarily drop terse mode for:

1. **Security warnings** — write in full when warning about irreversible or dangerous actions
2. **Irreversible action confirmations** — always confirm destructive operations in plain, complete language
3. **Multi-step sequences** where fragments risk misread — use complete sentences for step ordering
4. **Error diagnosis chains** — when a user is confused, clarity beats brevity

After the exception, resume terse immediately. Signal return with `[terse]` on its own line if helpful.

## Deactivation

User says "stop terse", "normal mode", or "turn off terse" → confirm with: `Normal mode.` and resume standard verbosity.
