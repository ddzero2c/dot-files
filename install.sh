#!/bin/bash

set -e -x

link() {
    local src=$1
    local dest=$2
    [ -e "$dest" ] && mv "$dest" "${dest}.$(date +%Y%m%d-%H%M%S)-bak"
    ln -s "$src" "$dest"
}

dotfiles="bashrc bash_profile bash_aliases bash_ps1 skhdrc gitconfig tmux.conf"
for f in $dotfiles; do
    link "$PWD/$f" ~/."$f"
done

mkdir -p ~/.bashrc.d ~/.config ~/.claude ~/.cursor
configfiles="nvim ghostty"
for f in $configfiles; do
    link "$PWD/$f" ~/.config/"$f"
done

link "$PWD/bin" ~/bin
link "$PWD/assets" ~/assets
link "$PWD/claude-settings.json" ~/.claude/settings.json
link "$PWD/commands" ~/.claude/commands
link "$PWD/skills" ~/.claude/skills

# Cursor CLI statusline — absolute path required (spawn has no shell / no ~ expansion mid-argv)
if [ -f "$HOME/.cursor/cli-config.json" ] && command -v jq >/dev/null; then
    tmp=$(mktemp)
    jq --arg cmd "$HOME/bin/cursor-statusline" '
      .statusLine = {
        type: "command",
        command: $cmd,
        padding: 2,
        updateIntervalMs: 1000,
        timeoutMs: 4000
      }
    ' "$HOME/.cursor/cli-config.json" >"$tmp"
    /bin/cp "$tmp" "$HOME/.cursor/cli-config.json"
    rm -f "$tmp"
fi

#/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install bash-completion
brew install tig
brew install asdf
brew install gh
brew install tmux
brew install kubectl
brew install fd
brew install ag
brew install rg
brew install fzf
brew install terminal-notifier

# install tpm
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
