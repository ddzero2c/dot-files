#!/bin/bash

set -e -x

link() {
    local src=$1
    local dest=$2
    [ -e "$dest" ] && mv "$dest" "${dest}.$(date +%Y%m%d-%H%M%S)-bak"
    ln -s "$src" "$dest"
}

dotfiles="bashrc bash_profile bash_aliases bash_ps1 gitconfig tmux.conf"
for f in $dotfiles; do
    link "$PWD/$f" ~/."$f"
done

mkdir -p ~/.bashrc.d ~/.config
configfiles="nvim"
for f in $configfiles; do
    link "$PWD/$f" ~/.config/"$f"
done

link "$PWD/bin" ~/bin
link "$PWD/assets" ~/assets

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
brew install terminal-notifier

# install tpm
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
