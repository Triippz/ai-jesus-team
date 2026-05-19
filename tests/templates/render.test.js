/**
 * TDD red-phase tests for the template engine module.
 * The implementation at ../../scripts/lib/template-engine.js does not exist yet.
 * These tests are expected to fail on import until the module is created.
 *
 * @module tests/templates/render.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplate, renderFile } from '../../scripts/lib/template-engine.js';

// ---------------------------------------------------------------------------
// 1. Simple variable substitution
// ---------------------------------------------------------------------------
describe('renderTemplate — simple variable substitution', () => {
  it('replaces {{name}} with the corresponding variable value', () => {
    const result = renderTemplate('Hello, {{name}}!', { name: 'atlas' });
    assert.equal(result, 'Hello, atlas!');
  });

  it('replaces multiple occurrences of the same placeholder', () => {
    const result = renderTemplate('{{name}} is {{name}}', { name: 'atlas' });
    assert.equal(result, 'atlas is atlas');
  });
});

// ---------------------------------------------------------------------------
// 2. Nested variable substitution
// ---------------------------------------------------------------------------
describe('renderTemplate — nested variable paths', () => {
  it('resolves {{profile.stack.language}} from a deeply nested object', () => {
    const variables = { profile: { stack: { language: 'rust' } } };
    const result = renderTemplate('Language: {{profile.stack.language}}', variables);
    assert.equal(result, 'Language: rust');
  });

  it('resolves a two-level nested path', () => {
    const variables = { user: { name: 'atlas' } };
    const result = renderTemplate('User: {{user.name}}', variables);
    assert.equal(result, 'User: atlas');
  });
});

// ---------------------------------------------------------------------------
// 3. Multiple variables in one template
// ---------------------------------------------------------------------------
describe('renderTemplate — multiple distinct variables', () => {
  it('substitutes all placeholders in a single pass', () => {
    const template = '{{greeting}}, {{name}}! You are using {{profile.stack.language}}.';
    const variables = {
      greeting: 'Hello',
      name: 'atlas',
      profile: { stack: { language: 'rust' } },
    };
    const result = renderTemplate(template, variables);
    assert.equal(result, 'Hello, atlas! You are using rust.');
  });
});

// ---------------------------------------------------------------------------
// 4. Conditional block — true condition
// ---------------------------------------------------------------------------
describe('renderTemplate — conditional blocks (true condition)', () => {
  it('renders the block body when the condition is truthy', () => {
    const template =
      '{% if profile.stack.language == "rust" %}rust content{% endif %}';
    const variables = { profile: { stack: { language: 'rust' } } };
    const result = renderTemplate(template, variables);
    assert.equal(result, 'rust content');
  });

  it('renders content surrounding a true conditional block', () => {
    const template =
      'before {% if enabled %}middle{% endif %} after';
    const result = renderTemplate(template, { enabled: true });
    assert.equal(result, 'before middle after');
  });
});

// ---------------------------------------------------------------------------
// 5. Conditional block — false condition
// ---------------------------------------------------------------------------
describe('renderTemplate — conditional blocks (false condition)', () => {
  it('omits the block body when the condition is falsy', () => {
    const template =
      '{% if profile.stack.language == "rust" %}rust content{% endif %}';
    const variables = { profile: { stack: { language: 'python' } } };
    const result = renderTemplate(template, variables);
    assert.equal(result, '');
  });

  it('leaves surrounding content intact when the condition is false', () => {
    const template = 'before {% if enabled %}middle{% endif %} after';
    const result = renderTemplate(template, { enabled: false });
    assert.equal(result, 'before  after');
  });
});

// ---------------------------------------------------------------------------
// 6. Nested conditionals
// ---------------------------------------------------------------------------
describe('renderTemplate — nested conditional blocks', () => {
  it('evaluates inner block only when both outer and inner conditions are true', () => {
    const template =
      '{% if outer %}A{% if inner %}B{% endif %}C{% endif %}';
    const result = renderTemplate(template, { outer: true, inner: true });
    assert.equal(result, 'ABC');
  });

  it('renders outer content but not inner content when outer true, inner false', () => {
    const template =
      '{% if outer %}A{% if inner %}B{% endif %}C{% endif %}';
    const result = renderTemplate(template, { outer: true, inner: false });
    assert.equal(result, 'AC');
  });

  it('renders nothing when outer condition is false regardless of inner', () => {
    const template =
      '{% if outer %}A{% if inner %}B{% endif %}C{% endif %}';
    const result = renderTemplate(template, { outer: false, inner: true });
    assert.equal(result, '');
  });
});

// ---------------------------------------------------------------------------
// 7. Missing variable throws Error containing the variable name
// ---------------------------------------------------------------------------
describe('renderTemplate — missing variable error', () => {
  it('throws an Error when a referenced variable is not present in variables', () => {
    assert.throws(
      () => renderTemplate('Hello, {{missing}}!', {}),
      (err) => {
        assert.ok(err instanceof Error, 'expected an Error instance');
        assert.ok(
          err.message.includes('missing'),
          `expected error message to contain "missing", got: ${err.message}`
        );
        return true;
      }
    );
  });

  it('includes the variable name for a missing nested path', () => {
    assert.throws(
      () => renderTemplate('{{profile.stack.language}}', { profile: {} }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes('profile.stack.language'),
          `expected error message to contain path, got: ${err.message}`
        );
        return true;
      }
    );
  });
});

// ---------------------------------------------------------------------------
// 8. Unclosed placeholder throws Error with line number
// ---------------------------------------------------------------------------
describe('renderTemplate — unclosed placeholder syntax error', () => {
  it('throws an Error for an unclosed {{ containing the line number', () => {
    const template = 'line one\n{{unclosed\nline three';
    assert.throws(
      () => renderTemplate(template, {}),
      (err) => {
        assert.ok(err instanceof Error, 'expected an Error instance');
        // The error must identify the problem line (line 2)
        assert.ok(
          err.message.includes('2') || err.message.toLowerCase().includes('line'),
          `expected error message to reference line number, got: ${err.message}`
        );
        return true;
      }
    );
  });
});

// ---------------------------------------------------------------------------
// 9. Unclosed conditional throws Error
// ---------------------------------------------------------------------------
describe('renderTemplate — unclosed conditional syntax error', () => {
  it('throws an Error when {% if %} has no matching {% endif %}', () => {
    const template = '{% if true %}content without endif';
    assert.throws(
      () => renderTemplate(template, {}),
      (err) => {
        assert.ok(err instanceof Error, 'expected an Error instance');
        assert.ok(
          err.message.toLowerCase().includes('endif') ||
            err.message.toLowerCase().includes('unclosed') ||
            err.message.toLowerCase().includes('if'),
          `expected error message to mention unclosed if/endif, got: ${err.message}`
        );
        return true;
      }
    );
  });
});

// ---------------------------------------------------------------------------
// 10. Empty template returns empty string
// ---------------------------------------------------------------------------
describe('renderTemplate — empty template', () => {
  it('returns an empty string when given an empty template', () => {
    const result = renderTemplate('', {});
    assert.equal(result, '');
  });
});

// ---------------------------------------------------------------------------
// 11. Template with no placeholders returns content unchanged
// ---------------------------------------------------------------------------
describe('renderTemplate — no placeholders', () => {
  it('returns the template string verbatim when there are no placeholders', () => {
    const template = 'No substitutions here. Just plain text.\n# Heading\n- item';
    const result = renderTemplate(template, {});
    assert.equal(result, template);
  });
});

// ---------------------------------------------------------------------------
// 12. Variables with special characters in values are inserted literally
// ---------------------------------------------------------------------------
describe('renderTemplate — special characters in variable values', () => {
  it('inserts values containing markdown syntax without escaping', () => {
    const variables = { content: '**bold** and _italic_ and `code`' };
    const result = renderTemplate('{{content}}', variables);
    assert.equal(result, '**bold** and _italic_ and `code`');
  });

  it('inserts values containing backslashes and angle brackets literally', () => {
    const variables = { path: 'C:\\Users\\atlas', tag: '<project>' };
    const result = renderTemplate('path={{path}} tag={{tag}}', variables);
    assert.equal(result, 'path=C:\\Users\\atlas tag=<project>');
  });

  it('inserts values containing newlines literally', () => {
    const variables = { block: 'line one\nline two' };
    const result = renderTemplate('start\n{{block}}\nend', variables);
    assert.equal(result, 'start\nline one\nline two\nend');
  });
});
