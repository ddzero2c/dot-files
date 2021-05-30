alias cp='cp -i'
alias mv='mv -i'
alias rm='rm -i'
alias ls='ls -G'
alias ll='ls -ahlF'

alias vbashrc="nvim ~/.bashrc"

alias w="watch "
alias d='docker'
alias dex='docker exec'
alias dps='docker ps'
alias dpsa='docker ps -a'
alias dc='docker-compose'
alias dcu='docker-compose up'
alias dcud='docker-compose up -d'
alias dcd='docker-compose down'
alias dcb='docker-compose build'

alias g='git'
__git_complete g __git_main
alias gist='gh gist'
source <(gh completion --shell bash)

alias k=kubectl
source <(kubectl completion bash)
alias kns=kubens
alias kctx=kubectx
complete -F __start_kubectl k

alias vim='nvim'
alias vdf='vimdiff'
alias vimdiff='nvim -d'
alias v='nvim -p'
alias t='tmux -2 -u'
alias f='nvim -p $(fzf)'

alias myip='ifconfig | grep "10\.\|192\.168" | cut -f2'

alias sbashrc='source ~/.bashrc'
