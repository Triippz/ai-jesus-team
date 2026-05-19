BATS := ./tests/bats/bin/bats

.PHONY: test test-hooks test-install test-sync test-json install-test-deps

install-test-deps:
	git submodule update --init --recursive

test: test-hooks test-install test-sync test-json

test-hooks:
	$(BATS) tests/core_hooks/ tests/plugin_hooks/

test-install:
	$(BATS) tests/install/

test-sync:
	$(BATS) tests/sync_cursor_rules/

test-json:
	$(BATS) tests/json_validation/
