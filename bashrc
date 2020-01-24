# aliases
alias cp='cp -i'
alias mv='mv -i'
alias rm='rm -i'
alias ls='ls --color=auto -hlF'
alias vi='vim -p'
alias grep='grep --color=auto'
alias tmux='tmux -2 -u'

# git branch
function git_branch {
    ref=$(git symbolic-ref HEAD 2> /dev/null) || return;
    echo " ("${ref#refs/heads/}")";
}

# simple prompt
PS1='\u@\[\033[01;34m\]\h\[\033[00m\]:\W$(git_branch) \$ '
IP=`who am i | awk '{print $NF}' | sed -e 's/[()]//g'`
HISTTIMEFORMAT="$USER@$IP %F %T "

bind '"\e[A": history-search-backward'
bind '"\e[B": history-search-forward'

# some more binaries and scripts
PATH=$PATH:~/bin
