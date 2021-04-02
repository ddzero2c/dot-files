#!/bin/bash

set -e -x

dotfiles="bashrc bash_profile gitconfig tmux.conf"
for f in $dotfiles; do
    [ -e ~/.$f ] && mv ~/.$f ~/.${f}.bak
    ln -s $PWD/$f ~/.$f
done

brew install autojump
brew install neovim --HEAD
