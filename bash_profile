# aliases
alias cp='cp -i'
alias mv='mv -i'
alias rm='rm -i'
alias ls='ls -G'
alias ll='ls -ahlF'
alias g='grep --color=auto'
alias t='tmux -2 -u'
alias v='vim -p'
alias d='docker'
alias vdf='vimdiff'

# git branch
function git_branch {
    ref=$(git symbolic-ref HEAD 2> /dev/null) || return;
    #mail=$(git config --get user.email 2> /dev/null) || return;
    echo "("${ref#refs/heads/}") ";
}

[ -f /etc/bash_completion ] && . /etc/bash_completion
[ -f /usr/local/etc/bash_completion ] && . /usr/local/etc/bash_completion

# simple prompt
PS1=$'\[\033[1;32m\]\u2192 \W $(git_branch)\[\033[00m\]'
#PS1='\u@\[\033[01;32m\]\h(prod)\[\033[00m\]:\W \$ '
IP=`who am i | awk '{print $NF}' | sed -e 's/[()]//g'`
HISTTIMEFORMAT="$USER@$IP %F %T "

bind '"\C-p": history-search-backward'
bind '"\C-n": history-search-forward'

[ -d ~/.bashrc.d ] && for f in ~/.bashrc.d/*; do
    source $f
done

# some more binaries and scripts
PATH=$PATH:~/bin
LANG=en_US.UTF-8
LANGUAGE=en:el
LC_ALL=en_US.UTF-8

LC_COLLATE=en_US.UTF-8

export FZF_DEFAULT_COMMAND='rg --files'
f() (
  IFS=$'\n' files=($(fzf --query="$1" --multi --select-1 --exit-0))
  [[ -n "$files" ]] && ${EDITOR:-vim} "${files[@]}"
)
