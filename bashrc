# aliases
alias cp='cp -i'
alias mv='mv -i'
alias rm='rm -i'
alias ls='ls -G'
alias ll='ls -ahlF'
alias g='grep -n -i --color=auto'
alias t='tmux -2 -u'
alias vimdiff='nvim -d'
alias v='nvim -p'
alias f='nvim +Files'
alias d='docker'

alias vdf='vimdiff'
alias vrc='nvim ~/.vimrc'
alias vbrc='nvim ~/.bash_profile'
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

# jump
eval "$(jump shell)"

#fzf
export FZF_DEFAULT_COMMAND='rg --files'
export FZF_DEFAULT_OPTS='-m --bind ctrl-a:select-all,ctrl-d:deselect-all'
[ -f ~/.fzf.bash ] && source ~/.fzf.bash
# simple prompt
PS1=$'\[\033[1;32m\]\u2192 \W $(git_branch)\[\033[00m\]'
#PS1='\u@\[\033[01;32m\]\h(prod)\[\033[00m\]:\W \$ '
#IP=`who am i | awk '{print $NF}' | sed -e 's/[()]//g'`
#HISTTIMEFORMAT="$USER@$IP %F %T "

bind '"\C-p": history-search-backward'
bind '"\C-n": history-search-forward'

[ -d ~/.bashrc.d ] && for f in ~/.bashrc.d/*; do
    source $f
done

# some more binaries and scripts
PATH=$PATH:~/bin
LANG="en_US.UTF-8"
LC_COLLATE="en_US.UTF-8"
LC_CTYPE="en_US.UTF-8"
LC_MESSAGES="en_US.UTF-8"
LC_MONETARY="en_US.UTF-8"
LC_NUMERIC="en_US.UTF-8"
LC_TIME="en_US.UTF-8"
LC_ALL="en_US.UTF-8"
