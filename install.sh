#!/bin/bash

set -e -x

dotfiles="bashrc vimrc gitconfig tmux.conf"
for f in $dotfiles; do
    [ -e ~/.$f ] && mv ~/.$f ~/.${f}.bak
    cp $PWD/$f ~/.$f
done

[ ! -d ~/.vim/bundle/Vundle.vim ] && \
    git clone https://github.com/VundleVim/Vundle.vim.git ~/.vim/bundle/Vundle.vim

vim +PluginInstall
