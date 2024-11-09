# some more binaries and scripts
if [[ -z $TMUX ]]; then
    PATH="$HOME/bin:$HOME/go/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
fi

# bash complete
[[ -r "/opt/homebrew/etc/profile.d/bash_completion.sh" ]] && . "/opt/homebrew/etc/profile.d/bash_completion.sh"

# export NVM_DIR="$HOME/.nvm"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

bind '"\C-p": history-search-backward'
bind '"\C-n": history-search-forward'

[ -f ~/.bash_aliases ] && source ~/.bash_aliases
[ -f ~/.bash_ps1 ] && source ~/.bash_ps1
[ -d ~/.bashrc.d ] && for f in ~/.bashrc.d/*; do
    source $f
done


# export TERM=xterm-kitty
export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"
export EDITOR="nvim"
export SHELL=/opt/homebrew/bin/bash

export PATH="/opt/homebrew/opt/icu4c/bin:$PATH"
export PATH="/opt/homebrew/opt/icu4c/sbin:$PATH"
export PATH="/opt/homebrew/opt/ansible@2.9/bin:$PATH"
export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
export PATH=$HOME/dev/flutter/bin:$PATH
export PATH=$HOME/.gem/bin:$PATH

export LDFLAGS="-L/opt/homebrew/opt/llvm/lib -L/opt/homebrew/lib"
export CPPFLAGS="-I/opt/homebrew/opt/llvm/include -I/opt/homebrew/include"

ASDF_GOLANG_MOD_VERSION_ENABLED=true
. "/opt/homebrew/opt/asdf/libexec/asdf.sh"
. "/opt/homebrew/opt/asdf/etc/bash_completion.d/asdf.bash"
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
