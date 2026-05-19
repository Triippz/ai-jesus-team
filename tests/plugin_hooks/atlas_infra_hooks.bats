#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  HOOK="$REPO_ROOT/plugins/atlas-infra-superpowers/hooks/block-terraform-destroy.sh"
  unset CLAUDE_PROJECT_DIR
}

@test "blocks terraform destroy on production" {
  run_hook "$HOOK" '{"tool_input":{"command":"terraform destroy -var-file=production.tfvars"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks terraform destroy with prod in cwd" {
  run_hook "$HOOK" '{"tool_input":{"command":"terraform destroy","cwd":"/infra/prod/us-east-1"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks terraform destroy with CLAUDE_PROJECT_DIR set to prod" {
  CLAUDE_PROJECT_DIR="/projects/production/infra" run_hook "$HOOK" '{"tool_input":{"command":"terraform destroy"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "warns on non-production terraform destroy" {
  run_hook "$HOOK" '{"tool_input":{"command":"terraform destroy -var-file=dev.tfvars"}}'
  assert_success
  assert_output --partial "WARNING"
}

@test "allows non-destroy terraform commands" {
  run_hook "$HOOK" '{"tool_input":{"command":"terraform plan"}}'
  assert_success
  refute_output --partial "WARNING"
}

@test "allows empty command" {
  run_hook "$HOOK" '{"tool_input":{}}'
  assert_success
}

@test "blocks terraform apply --destroy on production" {
  run_hook "$HOOK" '{"tool_input":{"command":"terraform apply --destroy -var-file=prod.tfvars"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}
