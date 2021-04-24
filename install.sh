#!/bin/bash

set -e -x

dotfiles="zshrc zsh_aliases bashrc bash_profile bash_aliases gitconfig tmux.conf kubectl_aliases"
for f in $dotfiles; do
    [ -e ~/.$f ] && mv ~/.$f ~/.${f}.bak
    ln -s $PWD/$f ~/.$f
done

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install bash
brew install bash-completion
brew install git
brew install tig
brew install gh
brew install tmux
brew install kubectl
brew install font-meslo-lg-nerd-font
brew install diff-so-fancy
brew install emojify
brew install fd
brew install ag
brew install rg

# install tpm
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
