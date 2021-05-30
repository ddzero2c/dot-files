# some more binaries and scripts
if [[ -z $TMUX ]]; then
    PATH="$HOME/bin:$HOME/go/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
fi

# bash complete
[ -f /etc/bash_completion ] && . /etc/bash_completion
[[ -r "/opt/homebrew/etc/profile.d/bash_completion.sh" ]] && . "/opt/homebrew/etc/profile.d/bash_completion.sh"

#fzf
export FZF_DEFAULT_COMMAND='fd --type f -H -E .git'
export FZF_DEFAULT_OPTS='-m --bind ctrl-a:select-all,ctrl-d:deselect-all'
[ -f ~/.fzf.bash ] && source ~/.fzf.bash

bind '"\C-p": history-search-backward'
bind '"\C-n": history-search-forward'

[ -f ~/.bash_aliases ] && source ~/.bash_aliases
[ -f ~/.kubectl_aliases ] && source ~/.kubectl_aliases

[ -d ~/.bashrc.d ] && for f in ~/.bashrc.d/*; do
    source $f
done


LANG="en_US.UTF-8"
LC_COLLATE="en_US.UTF-8"
LC_CTYPE="en_US.UTF-8"
LC_MESSAGES="en_US.UTF-8"
LC_MONETARY="en_US.UTF-8"
LC_NUMERIC="en_US.UTF-8"
LC_TIME="en_US.UTF-8"
LC_ALL="en_US.UTF-8"

export EDITOR="nvim"

eval "$(starship init bash)"
. "$HOME/.cargo/env"

export PATH="/opt/homebrew/opt/icu4c/bin:$PATH"
export PATH="/opt/homebrew/opt/icu4c/sbin:$PATH"
export PATH="/opt/homebrew/opt/ansible@2.9/bin:$PATH"
