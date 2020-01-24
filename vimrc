set nocompatible
filetype off

set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()
Plugin 'VundleVim/Vundle.vim'

Plugin 'tpope/vim-fugitive'
Plugin 'L9'
Plugin 'wincent/command-t'
Plugin 'rstacruz/sparkup', {'rtp': 'vim/'}

Plugin 'easymotion/vim-easymotion'
Plugin 'scrooloose/nerdtree'
Plugin 'mkitt/tabline.vim'
Plugin 'Yggdroot/indentLine'

call vundle#end()
filetype plugin indent on
autocmd FileType yaml,yml setlocal ts=2 sts=2 sw=2 expandtab

" for plugin
let g:EasyMotion_smartcase = 1

let mapleader=","
map <leader>r :source ~/.vimrc<cr>

"easymotion
map f <leader><leader>s

inoremap <C-c> <Esc>

" fix tmux background issue
syntax on
set t_ut=
set t_Co=256

" for ctags
set cst
set csto=1
set tag=.tags;

" for backspace
set bs=2

set history=100
set ruler
set showtabline=2

set hlsearch
set incsearch
set ignorecase
set smartcase

" return to top of file when search hit buttom
set wrapscan

set ai
set fileformat=unix
set fileformats=unix
set smartindent

"set noexpandtab
set expandtab
set tabstop=4
set shiftwidth=4
set number

set encoding=utf-8
set fileencoding=utf-8
set termencoding=utf-8
set ambiwidth=double

" no backup files
set nobackup
set nowritebackup
"swap files
set directory   =$HOME/.vim/files/
set updatecount =100
"undo files
set undofile
set undodir     =$HOME/.vim/files/
" viminfo files
set viminfo     ='100,n$HOME/.vim/files/viminfo

" coc compatiblity
set hidden
set cmdheight=2
set updatetime=300
set shortmess+=c

" record cursor
au BufReadPost * if line("'\"") > 1 && line("'\"") <= line("$") | exe "normal! g'\"" | endif

hi TabLineFill cterm=none ctermfg=black ctermbg = none
hi TabLine     cterm=none ctermfg=white ctermbg = none
hi TabLineSel  cterm=none ctermfg=black ctermbg = white
hi Visual      ctermfg=black
hi Search      ctermfg=black ctermbg=yellow

hi DiffAdd     ctermfg=black
hi DiffChange  ctermfg=black
hi DiffDelete  ctermfg=black
hi DiffText    ctermfg=black

" create directory if needed
if !isdirectory($HOME.'/.vim/files') && exists('*mkdir')
  call mkdir($HOME.'/.vim/files')
endif

