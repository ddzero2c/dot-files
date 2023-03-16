# some more binaries and scripts
if [[ -z $TMUX ]]; then
    PATH="$HOME/bin:$HOME/go/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
fi

# bash complete
[ -f /etc/bash_completion ] && . /etc/bash_completion
[[ -r "/opt/homebrew/etc/profile.d/bash_completion.sh" ]] && . "/opt/homebrew/etc/profile.d/bash_completion.sh"

#fzf
#export FZF_DEFAULT_COMMAND='fd --type f -H -E .git'
export FZF_DEFAULT_OPTS='-m --bind ctrl-a:select-all,ctrl-d:deselect-all'
[ -f ~/.fzf.bash ] && source ~/.fzf.bash

bind '"\C-p": history-search-backward'
bind '"\C-n": history-search-forward'

[ -f ~/.bash_aliases ] && source ~/.bash_aliases
[ -f ~/.kubectl_aliases ] && source ~/.kubectl_aliases

[ -d ~/.bashrc.d ] && for f in ~/.bashrc.d/*; do
    source $f
done


export TERM=xterm-kitty
export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"
export EDITOR="nvim"

eval "$(starship init bash)"

# export PATH="/opt/homebrew/opt/icu4c/bin:$PATH"
# export PATH="/opt/homebrew/opt/icu4c/sbin:$PATH"
# export PATH="/opt/homebrew/opt/ansible@2.9/bin:$PATH"
# export PATH="/opt/homebrew/opt/llvm/bin:$PATH"

# export LDFLAGS="-L/opt/homebrew/opt/llvm/lib -L/opt/homebrew/lib"
# export CPPFLAGS="-I/opt/homebrew/opt/llvm/include -I/opt/homebrew/include"

