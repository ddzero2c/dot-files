# auto-complete
if type brew &>/dev/null; then
  FPATH=$(brew --prefix)/share/zsh-completions:$FPATH
  autoload -Uz compinit
  compinit
fi

# bash-like
setopt noautomenu
bindkey -e
bindkey "^P" history-beginning-search-backward
bindkey "^N" history-beginning-search-forward

# customize
[ -f ~/.zsh_aliases ] && source ~/.zsh_aliases
[ -f ~/.kubectl_aliases ] && source ~/.kubectl_aliases
[ -d ~/.zshrc.d ] && for f in ~/.zshrc.d/*; do
    source $f
done

# fzf
export FZF_DEFAULT_COMMAND='fd --type f -H -E .git'
export FZF_DEFAULT_OPTS='-m --bind ctrl-a:select-all,ctrl-d:deselect-all'

LANG="en_US.UTF-8"
LC_COLLATE="en_US.UTF-8"
LC_CTYPE="en_US.UTF-8"
LC_MESSAGES="en_US.UTF-8"
LC_MONETARY="en_US.UTF-8"
LC_NUMERIC="en_US.UTF-8"
LC_TIME="en_US.UTF-8"
LC_ALL="en_US.UTF-8"
PATH="$PATH:~/bin:~/go/bin"

export EDITOR="nvim"

eval "$(starship init zsh)"

