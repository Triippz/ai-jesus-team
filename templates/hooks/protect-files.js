#!/usr/bin/env node
/**
 * protect-files.js — Block edits to sensitive files.
 *
 * Denies Write/Edit operations targeting .env files, .git/ internals,
 * credential files, and secret/key/certificate files.
 *
 * Input: JSON on stdin with shape { tool_input: { file_path: string } }
 *
 * Exit codes:
 *   0 – file is allowed
 *   2 – file is protected (denied)
 *
 * @module templates/hooks/protect-files
 */

import fs from 'node:fs'

let input = {}
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf8')
  input = JSON.parse(raw)
} catch { /* stdin may be empty or non-JSON in tests */ }

const filePath = input?.tool_input?.file_path ?? ''

if (!filePath) {
  process.exit(0)
}

const PROTECTED_PATTERNS = [
  { pattern: /(^|\/)\.env($|\..*)/, message: 'Cannot edit .env files. These contain secrets and should be managed manually.' },
  { pattern: /(^|\/)\.git\//, message: 'Cannot edit files inside .git/ directory.' },
  { pattern: /(^|\/)google-services\.json$/, message: 'Cannot edit google-services.json. This contains sensitive configuration.' },
  { pattern: /(^|\/)GoogleService-Info\.plist$/, message: 'Cannot edit GoogleService-Info.plist. This contains sensitive configuration.' },
  { pattern: /\.(secret|key|pem)$/, message: 'Cannot edit secret/key/certificate files (*.secret, *.key, *.pem).' },
]

for (const { pattern, message } of PROTECTED_PATTERNS) {
  if (pattern.test(filePath)) {
    process.stderr.write(`BLOCKED: ${message}\n`)
    process.exit(2)
  }
}

process.exit(0)
