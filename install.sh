#!/bin/bash

set -e -x

dotfiles="bashrc bash_profile bash_aliases bash_ps1 gitconfig tmux.conf"
for f in $dotfiles; do
    [ -e ~/.$f ] && mv ~/.$f ~/.${f}.$(date +%Y%m%d-%H%M%S)-bak
    ln -s $PWD/$f ~/.$f
done

configfiles="kitty/"
for f in $configfiles; do
    [ -e ~/.$f ] && mv ~/.config/$f ~/.config/${f}.$(date +%Y%m%d-%H%M%S)-bak
    ln -s $PWD/$f ~/.config/$f
done

#/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install bash-completions
brew install tig
brew install gh
brew install tmux
brew install kubectl
brew install emojify
brew install fd
brew install ag
brew install rg

# install tpm
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
