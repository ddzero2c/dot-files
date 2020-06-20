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
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'

" omni complete sources
Plug 'artur-shaik/vim-javacomplete2'

" syntax
Plug 'sheerun/vim-polyglot'

" colorscheme
Plug 'jeffkreeftmeijer/vim-dim'

call plug#end()

colorscheme dim

let mapleader=","
map <leader>r :source ~/.vimrc<cr>
inoremap <C-c> <Esc>
inoremap <C-f> <Right>
inoremap <C-b> <Left>
inoremap <C-a> <Home>
inoremap <C-e> <End>

" markdown preview
nmap <leader>mp <Plug>MarkdownPreviewToggle

" search
nnoremap <leader>g :<C-u>Rg <CR>
nnoremap <leader>G :<C-u>Ag <CR>
nnoremap <leader>t :<C-u>Files <CR>
nnoremap <silent> ; :<C-u>:Buffer<CR>

nmap <silent> gd <Plug>(coc-definition)
nmap <silent> gy <Plug>(coc-type-definition)
nmap <silent> gi <Plug>(coc-implementation)
nmap <silent> gr <Plug>(coc-references)

" synbol
nmap <leader>rn <Plug>(coc-rename)
autocmd CursorHold * silent call CocActionAsync('highlight')
set statusline^=%{coc#status()}%{get(b:,'coc_current_function','')}

" Formatting selected code.
command! -nargs=0 Prettier :CocCommand prettier.formatFile
xmap <leader>f  <Plug>(coc-format-selected)
nmap <leader>f  <Plug>(coc-format-selected)
augroup mygroup
  autocmd!
  " Setup formatexpr specified filetype(s).
  autocmd FileType typescript,json setl formatexpr=CocAction('formatSelected')
  " Update signature help on jump placeholder.
  autocmd User CocJumpPlaceholder call CocActionAsync('showSignatureHelp')
augroup end

" Use K to show documentation in preview window.
nnoremap <silent> K :call <SID>show_documentation()<CR>
function! s:show_documentation()
  if (index(['vim','help'], &filetype) >= 0)
    execute 'h '.expand('<cword>')
  else
    call CocAction('doHover')
  endif
endfunction

" Use `[g` and `]g` to navigate diagnostics
nmap <silent> [g <Plug>(coc-diagnostic-prev)
nmap <silent> ]g <Plug>(coc-diagnostic-next)

" Applying codeAction to the selected region.
" Example: `<leader>aap` for current paragraph
xmap <leader>a  <Plug>(coc-codeaction-selected)
nmap <leader>a  <Plug>(coc-codeaction-selected)

" Remap keys for applying codeAction to the current buffer.
nmap <leader>ac  <Plug>(coc-codeaction)
" Apply AutoFix to problem on the current line.
nmap <leader>qf  <Plug>(coc-fix-current)

" Map function and class text objects
" NOTE: Requires 'textDocument.documentSymbol' support from the language server.
xmap if <Plug>(coc-funcobj-i)
omap if <Plug>(coc-funcobj-i)
xmap af <Plug>(coc-funcobj-a)
omap af <Plug>(coc-funcobj-a)
xmap ic <Plug>(coc-classobj-i)
omap ic <Plug>(coc-classobj-i)
xmap ac <Plug>(coc-classobj-a)
omap ac <Plug>(coc-classobj-a)

" Use CTRL-S for selections ranges.
" Requires 'textDocument/selectionRange' support of LS, ex: coc-tsserver
nmap <silent> <C-s> <Plug>(coc-range-select)
xmap <silent> <C-s> <Plug>(coc-range-select)

command! -nargs=0 OR   :call     CocAction('runCommand', 'editor.action.organizeImport')

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
autocmd FileType jinja,j2 setlocal ts=2 sts=2 sw=2 expandtab
autocmd FileType yaml,yml setlocal ts=2 sts=2 sw=2 expandtab
autocmd FileType javascript setlocal ts=2 sts=2 sw=2 expandtab
autocmd Filetype json let g:indentLine_enabled = 0
let g:polyglot_disabled = ['markdown']

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
map f <Plug>(easymotion-overwin-f)

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

hi SignColumn ctermbg=none
hi CursorColumn ctermbg=green
hi FoldColumn ctermbg=none
hi Folded ctermbg=none
hi CursorLine cterm=none ctermbg=darkgrey
se stl=_ fcs=stl:_,stlnc:_,vert:\|

" create directory if needed
if !isdirectory($HOME.'/.vim/files') && exists('*mkdir')
  call mkdir($HOME.'/.vim/files')
endif


