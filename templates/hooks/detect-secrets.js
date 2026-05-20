#!/usr/bin/env node
/**
 * detect-secrets.js — Scan file content for hardcoded secrets.
 *
 * Checks tool_input.content, tool_input.new_string, or reads the file at
 * tool_input.file_path for patterns that look like API keys, bearer tokens,
 * hardcoded passwords, AWS access keys, and generic secrets/tokens.
 *
 * Input: JSON on stdin with shape { tool_input: { content?: string, new_string?: string, file_path?: string } }
 *
 * Exit codes:
 *   0 – no secrets detected
 *   2 – potential secrets found (denied)
 *
 * @module templates/hooks/detect-secrets
 */

import fs from 'node:fs'

let input = {}
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf8')
  input = JSON.parse(raw)
} catch { /* stdin may be empty or non-JSON in tests */ }

// Determine content to scan
let content = input?.tool_input?.content ?? ''

if (!content) {
  content = input?.tool_input?.new_string ?? ''
}

if (!content) {
  const filePath = input?.tool_input?.file_path ?? ''
  if (filePath && fs.existsSync(filePath)) {
    try {
      content = fs.readFileSync(filePath, 'utf8')
    } catch { /* file might not be readable */ }
  }
}

if (!content) {
  process.exit(0)
}

const SECRET_PATTERNS = [
  {
    pattern: /(sk-[a-zA-Z0-9]{8,}|pk_[a-zA-Z0-9]{8,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36,}|gho_[a-zA-Z0-9]{36,}|github_pat_[a-zA-Z0-9_]{20,})/,
    label: 'API key detected.',
  },
  {
    pattern: /Bearer\s+[a-zA-Z0-9._-]{20,}/,
    label: 'Bearer token detected.',
  },
  {
    pattern: /AKIA[0-9A-Z]{16}/,
    label: 'AWS access key detected.',
  },
]

const PASSWORD_RE = /password\s*=\s*["']([^"']{3,})["']/i
const PASSWORD_PLACEHOLDERS = /^(placeholder|changeme|xxx|your[_-]password|TODO|REPLACE)$/i
const SECRET_ASSIGN_RE = /secret\s*=\s*["'][^"']{3,}["']/i
const TOKEN_ASSIGN_RE = /token\s*=\s*["'][^"']{8,}["']/i

const findings = []

for (const { pattern, label } of SECRET_PATTERNS) {
  if (pattern.test(content)) {
    findings.push(label)
  }
}

const passwordMatch = PASSWORD_RE.exec(content)
if (passwordMatch && !PASSWORD_PLACEHOLDERS.test(passwordMatch[1])) {
  findings.push('Hardcoded password detected.')
}

if (SECRET_ASSIGN_RE.test(content)) {
  findings.push('Hardcoded secret detected.')
}

if (TOKEN_ASSIGN_RE.test(content)) {
  findings.push('Hardcoded token detected.')
}

// Deduplicate findings
const unique = [...new Set(findings)]

if (unique.length > 0) {
  process.stderr.write(
    `BLOCKED: Potential secrets detected in content. ${unique.join(' ')} ` +
    'Remove hardcoded secrets and use environment variables or a secrets manager instead.\n',
  )
  process.exit(2)
}

process.exit(0)
