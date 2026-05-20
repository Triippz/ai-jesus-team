#!/usr/bin/env node
/**
 * session-start.js — Inject the using-superpowers skill into session context.
 *
 * Reads the using-superpowers SKILL.md from the plugin's skills directory and
 * emits it as hookSpecificOutput.additionalContext so the skill is always
 * loaded at session start.
 *
 * Also fires on PreToolUse:Bash as a fallback for sessions that skip
 * SessionStart (e.g. resumed sessions).
 *
 * Exit codes:
 *   0 – always (non-blocking hook)
 *
 * @module templates/hooks/session-start
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(__dirname, '..')
const skillFile = path.join(pluginRoot, 'skills', 'using-superpowers', 'SKILL.md')

if (!fs.existsSync(skillFile)) {
  const output = JSON.stringify({
    hookSpecificOutput: {
      additionalContext: 'Warning: using-superpowers SKILL.md not found',
    },
  })
  process.stdout.write(output)
  process.exit(0)
}

const content = fs.readFileSync(skillFile, 'utf8')

const wrapper = [
  '<EXTREMELY_IMPORTANT>',
  'You have superpowers.',
  '',
  '**Below is the full content of your using-superpowers skill. For all other skills, use the Skill tool:**',
  '',
  content,
  '',
  '</EXTREMELY_IMPORTANT>',
].join('\n')

const output = JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: wrapper,
  },
})

process.stdout.write(output)
process.exit(0)
