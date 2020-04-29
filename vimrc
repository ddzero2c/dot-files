call plug#begin('~/.vim/plugged')

" movement
Plug 'easymotion/vim-easymotion'

" apperance
Plug 'Yggdroot/indentLine'
Plug 'psliwka/vim-smoothie' 

" GIT
Plug 'tpope/vim-fugitive'

" IDE like plugins
Plug 'neoclide/coc.nvim', {'branch': 'release'}
Plug 'liuchengxu/vim-clap'
Plug 'iamcco/markdown-preview.nvim', { 'do': { -> mkdp#util#install() } }

" omni complete sources
Plug 'artur-shaik/vim-javacomplete2'

" syntax
Plug 'martinda/Jenkinsfile-vim-syntax'
Plug 'rudes/vim-java'
Plug 'lepture/vim-jinja'

call plug#end()

let mapleader=","
map <leader>r :source ~/.vimrc<cr>
inoremap <C-c> <Esc>
inoremap <C-f> <Right>
inoremap <C-b> <Left>

" markdown preview
nmap <leader>mp <Plug>MarkdownPreviewToggle

" vim clap
nnoremap <leader>g :Clap grep ++query=<cword><cr>
vnoremap <leader>g :Clap grep ++query=@visual<cr>
nnoremap <leader>y :Clap yanks<cr>
let g:clap_theme = 'dark'

" coc explorer
nmap tt :CocCommand explorer<cr>

" tab move
map tn gt
map tp gT
map th <C-w>h
map tl <C-w>l
map tj <C-w>j
map tk <C-w>k

" filetype
filetype plugin indent on
autocmd FileType jinja,j2,html setlocal ts=2 sts=2 sw=2 expandtab
autocmd FileType yaml,yml setlocal ts=2 sts=2 sw=2 expandtab
autocmd Filetype json let g:indentLine_enabled = 0

" cocnvim
set hidden
set nobackup
set nowritebackup
set cmdheight=2
set updatetime=300
set shortmess+=c
set signcolumn=yes
set statusline^=%{coc#status()}%{get(b:,'coc_current_function','')}

" system clipboard
set clipboard+=unnamed

" easymotion
let g:EasyMotion_smartcase = 1
map f <leader><leader>s

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
let tabMinWidth = 0
let tabMaxWidth = 40
let tabMinWidthResized = 15
let tabScrollOff = 5
let tabEllipsis = '…'
let tabDivideEquel = 0

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

"swap files
set directory   =$HOME/.vim/files/
set updatecount =100
"undo files
set undofile
set undodir     =$HOME/.vim/files/
" viminfo files
set viminfo     ='100,n$HOME/.vim/files/viminfo
set updatetime=100

" record cursor
au BufReadPost * if line("'\"") > 1 && line("'\"") <= line("$") | exe "normal! g'\"" | endif

" highlights
hi TabLineFill cterm=none ctermfg=black ctermbg = none
hi TabLine     cterm=none ctermfg=grey ctermbg = none
hi TabLineSel  cterm=none ctermfg=white ctermbg = darkgrey
hi Visual      ctermfg=white ctermbg=darkgrey
hi Search      ctermfg=black ctermbg=yellow

hi DiffAdd     ctermfg=black
hi DiffChange  ctermfg=black
hi DiffDelete  ctermfg=black
hi DiffText    ctermfg=black

hi SignColumn ctermbg=none
hi CursorColumn ctermbg=green
hi FoldColumn ctermbg=none
hi Folded ctermbg=none

hi Pmenu ctermfg=darkgrey ctermbg=black
hi PmenuSel ctermfg=white ctermbg=darkgrey
hi PmenuSbar ctermbg=none
hi PmenuThumb ctermfg=white ctermbg=darkgrey

hi CursorLine cterm=none ctermbg=darkgrey

hi VertSplit cterm=none ctermfg=darkgrey
hi StatusLine cterm=bold ctermfg=darkgrey ctermbg=none
hi StatusLineNc cterm=none ctermfg=darkgrey ctermbg=none
se stl=_ fcs=stl:_,stlnc:_,vert:\|

" create directory if needed
if !isdirectory($HOME.'/.vim/files') && exists('*mkdir')
  call mkdir($HOME.'/.vim/files')
endif

" auto remember_folds
augroup remember_folds
  autocmd!
  autocmd BufWinLeave * mkview
  autocmd BufWinEnter * silent! loadview
augroup END

