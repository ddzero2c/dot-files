# dot-files installer
#
#   make            # same as `make install`
#   make links      # symlinks only
#   make cursor     # cursor CLI statusline
#   make brew       # homebrew packages
#   make tpm        # tmux plugin manager

SHELL := /bin/bash
HERE  := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))

DOTFILES    := bashrc bash_profile bash_aliases bash_ps1 skhdrc gitconfig tmux.conf
CONFIGFILES := nvim ghostty
CLAUDEFILES := settings.json commands skills hooks output-styles

BREW_PKGS := bash-completion tig asdf gh tmux kubectl fd ag rg fzf terminal-notifier

TPM_DIR := $(HOME)/.tmux/plugins/tpm

# link <src> <dest>: back up an existing dest (including a broken symlink) then symlink.
define LINK
link() { \
    local src=$$1 dest=$$2; \
    if [ -e "$$dest" ] || [ -L "$$dest" ]; then \
        mv "$$dest" "$$dest.$$(date +%Y%m%d-%H%M%S)-bak"; \
    fi; \
    ln -s "$$src" "$$dest"; \
}
endef

.PHONY: install links dirs cursor brew tpm purge help

# Dirs that `links` writes into — where the *.<timestamp>-bak leftovers land.
BAKDIRS := $(HOME) $(HOME)/.config $(HOME)/.claude $(HOME)/.cursor

.DEFAULT_GOAL := install

install: links cursor brew tpm

dirs:
	mkdir -p $(HOME)/.bashrc.d $(HOME)/.config $(HOME)/.claude $(HOME)/.cursor

links: dirs
	@set -e; \
	$(LINK); \
	for f in $(DOTFILES); do link "$(HERE)/$$f" "$(HOME)/.$$f"; done; \
	for f in $(CONFIGFILES); do link "$(HERE)/$$f" "$(HOME)/.config/$$f"; done; \
	link "$(HERE)/bin" "$(HOME)/bin"; \
	for f in $(CLAUDEFILES); do link "$(HERE)/claude/$$f" "$(HOME)/.claude/$$f"; done

# Cursor CLI statusline — absolute path required
# (spawn has no shell / no ~ expansion mid-argv)
cursor:
	@set -e; \
	if [ -f "$(HOME)/.cursor/cli-config.json" ] && command -v jq >/dev/null; then \
	    tmp=$$(mktemp); \
	    jq --arg cmd "$(HOME)/bin/cursor-statusline" \
	      '.statusLine = { type: "command", command: $$cmd, padding: 2, updateIntervalMs: 1000, timeoutMs: 4000 }' \
	      "$(HOME)/.cursor/cli-config.json" >"$$tmp"; \
	    /bin/cp "$$tmp" "$(HOME)/.cursor/cli-config.json"; \
	    rm -f "$$tmp"; \
	else \
	    echo "skip: ~/.cursor/cli-config.json or jq missing"; \
	fi

brew:
	brew install $(BREW_PKGS)

tpm:
	@if [ -d "$(TPM_DIR)" ]; then \
	    echo "skip: $(TPM_DIR) already exists"; \
	else \
	    git clone https://github.com/tmux-plugins/tpm "$(TPM_DIR)"; \
	fi

# Remove backups made by `links` (foo.20260825-171749-bak). Previews, then asks.
purge:
	@set -e; \
	found=$$(mktemp); \
	for d in $(BAKDIRS); do \
	    [ -d "$$d" ] || continue; \
	    find "$$d" -maxdepth 1 -mindepth 1 -name '*.[0-9]*-bak' -print >>"$$found"; \
	done; \
	if [ ! -s "$$found" ]; then \
	    echo "no *-bak backups found"; rm -f "$$found"; exit 0; \
	fi; \
	echo "would delete:"; \
	while IFS= read -r p; do ls -ldh "$$p"; done <"$$found"; \
	printf 'Delete? [y/N] '; \
	read -r ans || ans=; \
	case "$$ans" in \
	    y|Y) while IFS= read -r p; do rm -rf "$$p"; done <"$$found"; echo "deleted"; ;; \
	    *) echo "aborted, nothing deleted"; ;; \
	esac; \
	rm -f "$$found"

help:
	@echo "targets: install (default), links, dirs, cursor, brew, tpm, purge (remove *-bak backups)"
