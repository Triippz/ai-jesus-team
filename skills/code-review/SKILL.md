---
name: code-review
description: Triggered when running architecture, code quality, and security review on code changes
---

# Code Review Skill

Dispatch three review agents in parallel for comprehensive code review.

**Skill Type: Rigid** — All three reviews run, even if one finds nothing.

## Process

### 1. Identify Scope
- What files/changes are being reviewed?
- If reviewing a branch: `git diff main...HEAD` (or appropriate base branch)
- If reviewing specific files: read those files
- Collect the full list of changed files

### 2. Launch Review Agents (In Parallel)

Launch all three agents simultaneously:

#### Agent 1: Architecture Review (arch-reviewer)
- Module boundary compliance
- Dependency direction
- Separation of concerns
- Circular dependencies
- Abstraction appropriateness

#### Agent 2: Code Quality Review (code-reviewer)
- SOLID principles
- DRY violations (3+ occurrences)
- KISS compliance
- Naming clarity
- Function size and nesting depth
- Magic literals
- Dead code
- Error handling

#### Agent 3: Security Review (security-auditor)
- OWASP top 10
- Hardcoded secrets
- Injection vulnerabilities
- Input validation
- Sensitive data exposure
- Insecure dependencies

### 3. Collect and Deduplicate
- Gather findings from all three agents
- Remove duplicates (same issue flagged by multiple agents)
- Merge related findings into single items

### 4. Categorize and Present

Present findings in priority order:

#### Must Fix
Issues that will cause problems if merged:
- Security vulnerabilities
- Broken architecture boundaries
- Bugs or incorrect behavior
- Silent error swallowing

#### Should Fix
Issues that degrade quality:
- DRY violations
- Unclear naming
- Missing error handling
- Leaky abstractions

#### Consider
Suggestions for improvement:
- Style preferences
- Optional refactoring
- Performance improvements
- Better patterns available

### 5. Summary
- Total findings by category
- Overall assessment: Ready to merge / Needs work / Major issues
- Specific action items for the developer
