#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
}

@test "all JSON files in repo are valid" {
  local failed=0
  local checked=0
  while IFS= read -r json_file; do
    if ! python3 -m json.tool "$json_file" > /dev/null 2>&1; then
      echo "Invalid JSON: $json_file" >&2
      failed=$((failed + 1))
    fi
    checked=$((checked + 1))
  done < <(find "$REPO_ROOT" -name "*.json" -not -path "*/.git/*" -not -path "*/node_modules/*" -not -path "*/tests/bats/*" -not -path "*/bats-support/*" -not -path "*/bats-assert/*")

  echo "Checked $checked JSON files"
  [[ $failed -eq 0 ]]
}

@test "hooks.json is valid" {
  python3 -m json.tool "$REPO_ROOT/hooks/hooks.json" > /dev/null 2>&1
}

@test "all profile JSON files are valid" {
  for f in "$REPO_ROOT"/profiles/*.json; do
    [[ -f "$f" ]] || continue
    python3 -m json.tool "$f" > /dev/null 2>&1
  done
}
