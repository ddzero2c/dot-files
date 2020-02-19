# aliases
alias cp='cp -i'
alias mv='mv -i'
alias rm='rm -i'
alias ls='ls --color=auto'
alias ll='ls -ahlF'
alias grep='grep --color=auto'
alias t='tmux -2 -u'
alias v='vim -p'

# git branch
function git_branch {
    ref=$(git symbolic-ref HEAD 2> /dev/null) || return;
    mail=$(git config --get user.email 2> /dev/null) || return;
    echo " ("${ref#refs/heads/}\|${mail}")";
}

[ -f /etc/bash_completion ] && . /etc/bash_completion
[ -f /usr/local/etc/bash_completion ] && . /usr/local/etc/bash_completion

# simple prompt
PS1='\u@\[\033[01;34m\]\h\[\033[00m\]:\W\[\033[1;33m\]$(git_branch)\[\033[00m\] \$ '
IP=`who am i | awk '{print $NF}' | sed -e 's/[()]//g'`
HISTTIMEFORMAT="$USER@$IP %F %T "

bind '"\e[A": history-search-backward'
bind '"\e[B": history-search-forward'

for f in ~/.bashrc.d/*; do
    source $f
done

LANG=en_US.UTF-8
LANGUAGE=en:el
LC_ALL=en_US.UTF-8
PATH=$PATH:~/bin
