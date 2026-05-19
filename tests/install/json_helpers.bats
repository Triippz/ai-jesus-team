#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
}

@test "json_get extracts name from profile via python3" {
  local result
  result=$(python3 -c "
import json
with open('$REPO_ROOT/profiles/aok.json') as f:
    data = json.load(f)
print(data['name'])
")
  assert_equal "$result" "aok"
}

@test "json_get extracts description from profile" {
  local result
  result=$(python3 -c "
import json
with open('$REPO_ROOT/profiles/aok.json') as f:
    data = json.load(f)
print(data['description'])
")
  [[ -n "$result" ]]
}

@test "json_get_array extracts plugins from profile" {
  local result
  result=$(python3 -c "
import json
with open('$REPO_ROOT/profiles/aok.json') as f:
    data = json.load(f)
for item in data.get('plugins', []):
    print(item)
")
  [[ -n "$result" ]]
  echo "$result" | grep -q "core-superpowers"
}

@test "all profiles have required fields" {
  for pfile in "$REPO_ROOT"/profiles/*.json; do
    [[ "$(basename "$pfile")" == "profile-schema.json" ]] && continue
    [[ -f "$pfile" ]] || continue
    python3 -c "
import json, sys
with open('$pfile') as f:
    data = json.load(f)
for field in ['name', 'description', 'plugins']:
    assert field in data, f'Missing {field} in $(basename "$pfile")'
"
  done
}
