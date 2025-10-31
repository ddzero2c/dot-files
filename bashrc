eval "$(/opt/homebrew/bin/brew shellenv)"
# bash complete
if [[ -s $HOMEBREW_PREFIX/etc/profile.d/bash_completion.sh ]]; then
  . "$HOMEBREW_PREFIX/etc/profile.d/bash_completion.sh"
fi

bind '"\C-p": history-search-backward'
bind '"\C-n": history-search-forward'

[ -f ~/.bash_aliases ] && source ~/.bash_aliases
[ -f ~/.bash_ps1 ] && source ~/.bash_ps1
#[ -d ~/.bashrc.d ] && for f in ~/.bashrc.d/*; do
#    source $f
#done


export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"
export EDITOR="nvim"

ASDF_GOLANG_MOD_VERSION_ENABLED=true
. <(asdf completion bash)
export PATH="${ASDF_DATA_DIR:-$HOME/.asdf}/shims:$PATH"
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"
export PATH="$PATH":"$HOME/.pub-cache/bin"
export FLUTTER_ROOT="$(asdf where flutter)"
