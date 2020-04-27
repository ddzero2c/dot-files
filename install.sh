#!/bin/bash

set -e -x

dotfiles="bash_profile vimrc gitconfig tmux.conf"
for f in $dotfiles; do
    [ -e ~/.$f ] && mv ~/.$f ~/.${f}.bak
    cp $PWD/$f ~/.$f
done

curl -sL install-node.now.sh/lts | bash
brew tap homebrew/cask-fonts
brew cask install font-inconsolata-nerd-font
# manually change font for iTerminal

curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

vim +PluginInstall
