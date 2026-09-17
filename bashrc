HOMEBREW_NO_AUTO_UPDATE=1
eval "$(/opt/homebrew/bin/brew shellenv)"
# bash complete
if [[ -s $HOMEBREW_PREFIX/etc/profile.d/bash_completion.sh ]]; then
  . "$HOMEBREW_PREFIX/etc/profile.d/bash_completion.sh"
fi

bind '"\C-p": history-search-backward'
bind '"\C-n": history-search-forward'

[ -f ~/.bash_aliases ] && source ~/.bash_aliases
[ -f ~/.bash_ps1 ] && source ~/.bash_ps1
[ -d ~/.bashrc.d ] && for f in ~/.bashrc.d/*; do
   source $f
done

export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"
export EDITOR="nvim"

# git diff colors follow macOS appearance (Claude Code dark/light-daltonized palette);
# light values live in ~/.gitconfig, dark ones are injected here.
if defaults read -g AppleInterfaceStyle 2>/dev/null | grep -q Dark; then
  export GIT_CONFIG_COUNT=2
  export GIT_CONFIG_KEY_0=color.diff.old GIT_CONFIG_VALUE_0="#DEDCD4 #660000"
  export GIT_CONFIG_KEY_1=color.diff.new GIT_CONFIG_VALUE_1="#DEDCD4 #004466"
fi

ASDF_GOLANG_MOD_VERSION_ENABLED=true
. <(asdf completion bash)
export PATH="${ASDF_DATA_DIR:-$HOME/.asdf}/shims:$PATH"
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
export LDFLAGS="-L/opt/homebrew/opt/libpq/lib"
export CPPFLAGS="-I/opt/homebrew/opt/libpq/include"

export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/bin:$PATH"

export PATH="$PATH":"$HOME/.pub-cache/bin"
export FLUTTER_ROOT="$(asdf where flutter)"
#export CLAUDE_CODE_DISABLE_MOUSE=1
