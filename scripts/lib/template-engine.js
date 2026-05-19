/**
 * Template engine for .md file generation.
 *
 * Supports:
 *   - {{variable}} and {{nested.dot.path}} substitution
 *   - {% if condition %}...{% endif %} conditional blocks (nestable)
 *
 * @module scripts/lib/template-engine
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Resolve a dot-path string against an object.
 *
 * @param {string} dotPath - e.g. "profile.stack.language"
 * @param {Record<string, unknown>} variables
 * @returns {unknown}
 */
function resolvePath(dotPath, variables) {
  const segments = dotPath.split('.');
  let current = variables;
  for (const segment of segments) {
    if (current === null || current === undefined || !(segment in Object(current))) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

/**
 * Return the 1-based line number of the character at index inside text.
 *
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function lineNumberAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

/**
 * Validate template syntax — unclosed {{ or {% if %} without {% endif %}.
 *
 * @param {string} template
 */
function validateSyntax(template) {
  // Detect unclosed {{ placeholders
  let pos = 0;
  while (true) {
    const openIdx = template.indexOf('{{', pos);
    if (openIdx === -1) break;
    const closeIdx = template.indexOf('}}', openIdx + 2);
    if (closeIdx === -1) {
      const line = lineNumberAt(template, openIdx);
      throw new Error(`Syntax error: unclosed '{{' at line ${line}`);
    }
    pos = closeIdx + 2;
  }

  // Detect unbalanced {% if %} / {% endif %} pairs
  let depth = 0;
  let firstIfLine = -1;
  const tagRe = /\{%\s*(if|endif)\b[^%]*%\}/g;
  let m;
  while ((m = tagRe.exec(template)) !== null) {
    if (m[1] === 'if') {
      if (depth === 0) firstIfLine = lineNumberAt(template, m.index);
      depth++;
    } else {
      depth--;
      if (depth < 0) {
        const line = lineNumberAt(template, m.index);
        throw new Error(`Syntax error: orphaned endif at line ${line} has no matching if`);
      }
    }
  }
  if (depth !== 0) {
    const ref = firstIfLine !== -1 ? ` (opened at line ${firstIfLine})` : '';
    throw new Error(`Syntax error: unclosed if block without matching endif${ref}`);
  }
}

// ---------------------------------------------------------------------------
// Safe condition evaluator — no eval / new Function / vm
// ---------------------------------------------------------------------------

/**
 * Tokenize a condition string into an array of token objects.
 * Recognized token types:
 *   - 'bool'   : true | false literals
 *   - 'str'    : "..." or '...' string literal (value is the inner string)
 *   - 'arr'    : [...] array literal (value is an array of string tokens)
 *   - 'kw'     : not | and | or | in
 *   - 'op'     : == | !=
 *   - 'var'    : variable dot-path, e.g. profile.stack.language
 *   - 'lparen' : (
 *   - 'rparen' : )
 *
 * Throws for any character sequence that does not match a whitelisted token.
 *
 * @param {string} condition
 * @returns {Array<{type: string, value: unknown}>}
 */
function tokenize(condition) {
  const tokens = [];
  let i = 0;
  const src = condition.trim();

  while (i < src.length) {
    // Skip whitespace
    if (/\s/.test(src[i])) { i++; continue; }

    // String literal  "..." or '...'
    if (src[i] === '"' || src[i] === "'") {
      const quote = src[i];
      let j = i + 1;
      while (j < src.length && src[j] !== quote) j++;
      if (j >= src.length) throw new Error(`Condition syntax error: unterminated string at position ${i}`);
      tokens.push({ type: 'str', value: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }

    // Array literal [...]
    if (src[i] === '[') {
      let j = i + 1;
      while (j < src.length && src[j] !== ']') j++;
      if (j >= src.length) throw new Error(`Condition syntax error: unterminated array at position ${i}`);
      const inner = src.slice(i + 1, j).trim();
      const items = inner.length === 0 ? [] : inner.split(',').map((s) => {
        const t = s.trim();
        if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
          return t.slice(1, -1);
        }
        throw new Error(`Condition syntax error: array elements must be string literals, got: ${t}`);
      });
      tokens.push({ type: 'arr', value: items });
      i = j + 1;
      continue;
    }

    // Two-character operators == and !=
    if (i + 1 < src.length) {
      const two = src.slice(i, i + 2);
      if (two === '==' || two === '!=') {
        tokens.push({ type: 'op', value: two });
        i += 2;
        continue;
      }
    }

    // Parentheses
    if (src[i] === '(') { tokens.push({ type: 'lparen', value: '(' }); i++; continue; }
    if (src[i] === ')') { tokens.push({ type: 'rparen', value: ')' }); i++; continue; }

    // Identifiers, keywords, boolean literals
    const identMatch = /^[a-zA-Z_][a-zA-Z0-9_.]*/.exec(src.slice(i));
    if (identMatch) {
      const word = identMatch[0];
      if (word === 'true')  { tokens.push({ type: 'bool', value: true });  i += word.length; continue; }
      if (word === 'false') { tokens.push({ type: 'bool', value: false }); i += word.length; continue; }
      if (word === 'not' || word === 'and' || word === 'or' || word === 'in') {
        tokens.push({ type: 'kw', value: word });
      } else {
        tokens.push({ type: 'var', value: word });
      }
      i += word.length;
      continue;
    }

    throw new Error(`Condition syntax error: unexpected character '${src[i]}' at position ${i} in: ${condition}`);
  }

  return tokens;
}

/**
 * Evaluate a token stream that represents a single atomic expression or a
 * negated one.  Returns { result: boolean, consumed: number }.
 *
 * Atom := 'not' Atom
 *       | '(' Expr ')'
 *       | Value [ ('=='|'!=') Value ]
 *       | Value 'not' 'in' ArrValue
 *       | Value 'in' ArrValue
 *
 * Value := var | str | bool
 *
 * @param {Array<{type:string,value:unknown}>} tokens
 * @param {number} pos
 * @param {Record<string, unknown>} variables
 * @returns {{ result: boolean, pos: number }}
 */
function evalAtom(tokens, pos, variables) {
  // 'not' prefix
  if (pos < tokens.length && tokens[pos].type === 'kw' && tokens[pos].value === 'not') {
    const inner = evalAtom(tokens, pos + 1, variables);
    return { result: !inner.result, pos: inner.pos };
  }

  // Parenthesised sub-expression
  if (pos < tokens.length && tokens[pos].type === 'lparen') {
    const inner = evalExpr(tokens, pos + 1, variables);
    if (inner.pos >= tokens.length || tokens[inner.pos].type !== 'rparen') {
      throw new Error('Condition syntax error: missing closing parenthesis');
    }
    return { result: inner.result, pos: inner.pos + 1 };
  }

  // Resolve left-hand value
  const lhsTok = tokens[pos];
  if (!lhsTok) throw new Error('Condition syntax error: unexpected end of expression');
  const lhsVal = resolveToken(lhsTok, variables);
  pos++;

  // Check for binary operator or 'not in' / 'in'
  if (pos < tokens.length) {
    const next = tokens[pos];

    // Value 'not' 'in' ArrValue
    if (next.type === 'kw' && next.value === 'not') {
      const after = tokens[pos + 1];
      if (after && after.type === 'kw' && after.value === 'in') {
        const arrTok = tokens[pos + 2];
        if (!arrTok || arrTok.type !== 'arr') throw new Error('Condition syntax error: expected array after "not in"');
        const arr = arrTok.value;
        return { result: !arr.includes(String(lhsVal)), pos: pos + 3 };
      }
    }

    // Value 'in' ArrValue
    if (next.type === 'kw' && next.value === 'in') {
      const arrTok = tokens[pos + 1];
      if (!arrTok || arrTok.type !== 'arr') throw new Error('Condition syntax error: expected array after "in"');
      const arr = arrTok.value;
      return { result: arr.includes(String(lhsVal)), pos: pos + 2 };
    }

    // Value ('==' | '!=') Value
    if (next.type === 'op') {
      const rhsTok = tokens[pos + 1];
      if (!rhsTok) throw new Error(`Condition syntax error: missing right-hand side for operator '${next.value}'`);
      const rhsVal = resolveToken(rhsTok, variables);
      pos += 2;
      if (next.value === '==') return { result: String(lhsVal) === String(rhsVal), pos };
      if (next.value === '!=') return { result: String(lhsVal) !== String(rhsVal), pos };
    }
  }

  // Plain truthiness check
  return { result: Boolean(lhsVal), pos };
}

/**
 * Resolve a single token to its runtime value.
 *
 * @param {{type:string,value:unknown}} tok
 * @param {Record<string, unknown>} variables
 * @returns {unknown}
 */
function resolveToken(tok, variables) {
  if (tok.type === 'str')  return tok.value;
  if (tok.type === 'bool') return tok.value;
  if (tok.type === 'var')  return resolvePath(String(tok.value), variables);
  throw new Error(`Condition syntax error: unexpected token type '${tok.type}'`);
}

/**
 * Evaluate a full condition expression, handling 'and' / 'or' logical operators.
 * Operator precedence: 'and' binds tighter than 'or' (standard boolean precedence).
 *
 * Expr := AndExpr ( 'or' AndExpr )*
 * AndExpr := Atom ( 'and' Atom )*
 *
 * @param {Array<{type:string,value:unknown}>} tokens
 * @param {number} pos
 * @param {Record<string, unknown>} variables
 * @returns {{ result: boolean, pos: number }}
 */
function evalExpr(tokens, pos, variables) {
  // Parse first AndExpr
  let { result: lhs, pos: cur } = evalAndExpr(tokens, pos, variables);

  while (cur < tokens.length && tokens[cur].type === 'kw' && tokens[cur].value === 'or') {
    const rhs = evalAndExpr(tokens, cur + 1, variables);
    lhs = lhs || rhs.result;
    cur = rhs.pos;
  }

  return { result: lhs, pos: cur };
}

/**
 * @param {Array<{type:string,value:unknown}>} tokens
 * @param {number} pos
 * @param {Record<string, unknown>} variables
 * @returns {{ result: boolean, pos: number }}
 */
function evalAndExpr(tokens, pos, variables) {
  let { result: lhs, pos: cur } = evalAtom(tokens, pos, variables);

  while (cur < tokens.length && tokens[cur].type === 'kw' && tokens[cur].value === 'and') {
    const rhs = evalAtom(tokens, cur + 1, variables);
    lhs = lhs && rhs.result;
    cur = rhs.pos;
  }

  return { result: lhs, pos: cur };
}

/**
 * Evaluate a condition string against the variables object using a safe,
 * restricted expression parser.  No eval, new Function, or vm is used.
 *
 * Supported syntax:
 *   - Boolean truthiness:  `profile.review_thresholds`
 *   - Negation:            `not profile.some_field`
 *   - Equality:            `profile.stack.language == "rust"`
 *   - Inequality:          `profile.stack.language != "python"`
 *   - In array:            `profile.stack.language in ["rust", "go"]`
 *   - Not in array:        `profile.stack.language not in ["rust", "go"]`
 *   - Logical and/or:      `a and b`, `a or b`
 *   - Parentheses:         `(a or b) and c`
 *   - Boolean literals:    `true`, `false`
 *
 * @param {string} condition
 * @param {Record<string, unknown>} variables
 * @returns {boolean}
 */
function evalCondition(condition, variables) {
  try {
    const tokens = tokenize(condition);
    if (tokens.length === 0) return false;
    const { result } = evalExpr(tokens, 0, variables);
    return result;
  } catch {
    return false;
  }
}

/**
 * Process {% if condition %}...{% endif %} blocks recursively.
 * Outermost blocks are resolved first; surviving bodies are recursed into.
 *
 * @param {string} template
 * @param {Record<string, unknown>} variables
 * @returns {string}
 */
function processConditionals(template, variables) {
  const openRe = /\{%\s*if\s+([\s\S]*?)\s*%\}/;
  const openMatch = openRe.exec(template);
  if (!openMatch) return template;

  const openStart = openMatch.index;
  const openEnd = openStart + openMatch[0].length;
  const condition = openMatch[1];

  // Walk forward to find the matching endif, respecting nesting depth
  let depth = 1;
  let cursor = openEnd;
  let endifStart = -1;
  let endifEnd = -1;

  while (depth > 0) {
    const nextBrace = template.indexOf('{%', cursor);
    if (nextBrace === -1) break;

    const tagTest = /^\{%\s*(if|endif)\b/.exec(template.slice(nextBrace));
    if (!tagTest) { cursor = nextBrace + 2; continue; }

    const closing = template.indexOf('%}', nextBrace);
    if (closing === -1) break;
    const tagEnd = closing + 2;

    if (tagTest[1] === 'if') {
      depth++;
      cursor = tagEnd;
    } else {
      depth--;
      if (depth === 0) {
        endifStart = nextBrace;
        endifEnd = tagEnd;
      } else {
        cursor = tagEnd;
      }
    }
  }

  if (endifStart === -1) {
    throw new Error('Syntax error: unclosed if block without matching endif');
  }

  const body = template.slice(openEnd, endifStart);
  const before = template.slice(0, openStart);
  const after = template.slice(endifEnd);

  const resolved = evalCondition(condition, variables)
    ? processConditionals(body, variables)
    : '';

  return before + resolved + processConditionals(after, variables);
}

/**
 * Replace every {{dotPath}} placeholder with its resolved value.
 *
 * @param {string} template
 * @param {Record<string, unknown>} variables
 * @returns {string}
 */
function substituteVariables(template, variables) {
  const re = /\{\{([^}]+)\}\}/g;
  let result = '';
  let last = 0;
  let match;

  while ((match = re.exec(template)) !== null) {
    result += template.slice(last, match.index);
    const dotPath = match[1].trim();
    const value = resolvePath(dotPath, variables);
    if (value === undefined) {
      const line = lineNumberAt(template, match.index);
      throw new Error(`Missing variable '${dotPath}' at line ${line}`);
    }
    result += String(value);
    last = match.index + match[0].length;
  }

  return result + template.slice(last);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a template string.
 *
 * Processing order:
 *   1. Syntax validation
 *   2. Conditional block evaluation (outermost to innermost)
 *   3. Variable substitution
 *
 * @param {string} templateContent
 * @param {Record<string, unknown>} variables
 * @returns {string}
 */
export function renderTemplate(templateContent, variables) {
  if (templateContent === '') return '';
  validateSyntax(templateContent);
  const afterIf = processConditionals(templateContent, variables);
  return substituteVariables(afterIf, variables);
}

/**
 * Read a template file, render it, and write the result to outputPath.
 *
 * @param {string} templatePath
 * @param {Record<string, unknown>} variables
 * @param {string} outputPath
 * @returns {string} rendered content
 */
export function renderFile(templatePath, variables, outputPath) {
  const src = path.resolve(templatePath);
  const content = fs.readFileSync(src, 'utf8');
  const rendered = renderTemplate(content, variables);
  const dest = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, rendered, 'utf8');
  return rendered;
}
