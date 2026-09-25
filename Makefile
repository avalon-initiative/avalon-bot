SHELL := /bin/bash
.DEFAULT_GOAL := help

-include .env
export

RUN_DIR := _running
PID_FILE := $(RUN_DIR)/avalon-bot.pid
LOG_FILE := $(RUN_DIR)/avalon-bot.log

.PHONY: help install build run start stop restart status register-commands test typecheck fmt fmt-check lint check clean

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  make %-18s %s\n", $$1, $$2}'

install: ## Install dependencies
	npm ci

build: ## Compile to dist/
	npm run build

run: build ## Run in the foreground
	node dist/index.js

start: build ## Run in the background (pid/log under _running/)
	@mkdir -p $(RUN_DIR)
	@if [ -f $(PID_FILE) ] && kill -0 "$$(cat $(PID_FILE))" 2>/dev/null; then \
		echo "already running (pid $$(cat $(PID_FILE)))"; \
	else \
		( node dist/index.js > $(LOG_FILE) 2>&1 & echo $$! > $(PID_FILE) ); \
		sleep 1; echo "started (pid $$(cat $(PID_FILE))), logs: $(LOG_FILE)"; \
	fi

stop: ## Stop the background process
	@if [ -f $(PID_FILE) ] && kill -0 "$$(cat $(PID_FILE))" 2>/dev/null; then \
		kill "$$(cat $(PID_FILE))"; rm -f $(PID_FILE); echo "stopped"; \
	else echo "not running"; rm -f $(PID_FILE); fi

restart: stop start ## Stop, then start

status: ## Report whether the background process is running
	@if [ -f $(PID_FILE) ] && kill -0 "$$(cat $(PID_FILE))" 2>/dev/null; then \
		echo "running (pid $$(cat $(PID_FILE)))"; else echo "not running"; fi

register-commands: ## Register the Discord context-menu command in the configured guild
	npm run register-commands

test: ## Unit tests
	npm test

typecheck: ## Type-check sources and tests
	npm run typecheck

fmt: ## Auto-format
	npm run format

fmt-check: ## Check formatting without writing
	npm run format:check

lint: ## Lint
	npm run lint

check: fmt-check typecheck lint test ## What CI runs

clean: ## Remove build output and run state
	rm -rf dist coverage $(RUN_DIR)
