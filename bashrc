# aliases
alias cp='cp -i'
alias mv='mv -i'
alias rm='rm -i'
alias ls='ls --color'
alias ll='ls -ahlF'
alias vimdiff='nvim -d'
alias vim='nvim'
alias v='nvim -p'
alias vg='nvim +GhostStart'
alias g='git'
alias t='tmux -2 -u'
alias f='nvim +Files'
alias d='docker'
alias dc='docker-compose'
alias dmer='docker-compose up -d mongo-setup es redis'
alias gist='gh gist'

alias vdf='vimdiff'
alias vrc='nvim ~/.config/nvim/init.vim'
alias vcoc='nvim ~/.config/nvim/coc-settings.json'
alias vbrc='nvim ~/.bashrc'
alias vpoprc='nvim ~/.bashrc.d/popdaily'

alias sbrc='source ~/.bash_profile'
alias myip='ifconfig | grep "10\.\|192\.168" | cut -f2'

# git branch
function git_branch {
    ref=$(git symbolic-ref HEAD 2> /dev/null) || return;
    #mail=$(git config --get user.email 2> /dev/null) || return;
    echo "("${ref#refs/heads/}") ";
}

# bash complete
[ -f /etc/bash_completion ] && . /etc/bash_completion
[ -f /usr/local/etc/bash_completion ] && . /usr/local/etc/bash_completion
__git_complete g __git_main

# jump
eval "$(jump shell)"

#fzf
export FZF_DEFAULT_COMMAND='fd --type f -H -E .git'
export FZF_DEFAULT_OPTS='-m --bind ctrl-a:select-all,ctrl-d:deselect-all'
[ -f ~/.fzf.bash ] && source ~/.fzf.bash

# simple prompt
PS1=$'\[\033[1;32m\]\u2192 \W $(git_branch)\[\033[00m\]'

bind '"\C-p": history-search-backward'
bind '"\C-n": history-search-forward'

source <(flux completion bash)
source <(kubectl completion bash)
source <(gh completion --shell bash)
alias k=kubectl
complete -F __start_kubectl k

[ -d ~/.bashrc.d ] && for f in ~/.bashrc.d/*; do
    source $f
done

# some more binaries and scripts
PATH="$PATH:~/bin"
PATH="/usr/local/opt/findutils/libexec/gnubin:$PATH"
PATH="/usr/local/opt/gnu-sed/libexec/gnubin:$PATH"
PATH="/usr/local/opt/coreutils/libexec/gnubin:$PATH"

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
