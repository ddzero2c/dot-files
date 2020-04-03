#!/bin/bash

set -e -x

dotfiles="bash_profile vimrc gitconfig tmux.conf"
for f in $dotfiles; do
    [ -e ~/.$f ] && mv ~/.$f ~/.${f}.bak
    cp $PWD/$f ~/.$f
done

python3 -m pip install pynvim

curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

vim +PluginInstall
