alias cp='cp -i'
alias mv='mv -i'
alias rm='rm -i'
alias ls='ls -G'
alias ll='ls -ahlF'

alias d='docker'
alias dc='docker-compose'

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

#source <(flux completion bash)

alias cdpopser='cd ~/popdaily/popdaily.server'

alias cdafws='cd ~/assetflow/assetflow-ws'
