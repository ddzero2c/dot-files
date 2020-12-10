#!/bin/bash

set -e -x

dotfiles="bashrc bash_profile gitconfig tmux.conf"
for f in $dotfiles; do
    [ -e ~/.$f ] && mv ~/.$f ~/.${f}.bak
    cp $PWD/$f ~/.$f
done

curl -sL install-node.now.sh/lts | bash

#brew tap homebrew/cask-fonts
#brew cask install font-inconsolata-nerd-font

brew install autojump
brew install jq
brew install git-delta
brew install neovim

nvimfiles="coc-settings.json init.vim"
for f in $dotfiles; do
    [ -e ~/.config/nvim/$f ] && mv ~/.config/nvim/$f ~/.config/nvim/$f.bak
    cp $PWD/$f ~/.config/nvim/$f
done

sh -c 'curl -fLo "${XDG_DATA_HOME:-$HOME/.local/share}"/nvim/site/autoload/plug.vim --create-dirs \
       https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim'

vim +PluginInstall
