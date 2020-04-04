call plug#begin('~/.vim/plugged')

" movement
Plug 'easymotion/vim-easymotion'

" apperance
Plug 'Yggdroot/indentLine'
Plug 'psliwka/vim-smoothie' 

" GIT
Plug 'tpope/vim-fugitive'
Plug 'mhinz/vim-signify', { 'branch': 'legacy' }

" IDE like plugins
Plug 'Shougo/deoplete.nvim'
Plug 'Shougo/denite.nvim'
Plug 'Shougo/defx.nvim'
Plug 'kristijanhusak/defx-icons'
Plug 'Shougo/echodoc.vim'
Plug 'roxma/nvim-yarp'
Plug 'roxma/vim-hug-neovim-rpc'
Plug 'tbodt/deoplete-tabnine', { 'do': './install.sh' }

" omni complete sources
Plug 'deoplete-plugins/deoplete-jedi'
Plug 'artur-shaik/vim-javacomplete2'

" syntax
Plug 'martinda/Jenkinsfile-vim-syntax'
Plug 'rudes/vim-java'

call plug#end()

let mapleader=","
map <leader>r :source ~/.vimrc<cr>
inoremap <C-c> <Esc>
inoremap <C-f> <Right>
inoremap <C-b> <Left>

map <C-h> <C-w>h
map <C-l> <C-w>l
map <C-j> <C-w>j
map <C-k> <C-w>k

" tabnine
call deoplete#custom#var('tabnine', {
\ 'line_limit': 100,
\ 'max_num_results': 2,
\ })
call deoplete#custom#source('tabnine', 'rank', 50)

" deoplete
let g:deoplete#enable_at_startup = 1
let g:deoplete#ignore_sources = {}
let g:deoplete#ignore_sources._ = ['javacomplete2']
call deoplete#custom#option('auto_complete_delay', 120)

" filetype
filetype plugin indent on
autocmd FileType yaml,yml setlocal ts=2 sts=2 sw=2 expandtab
autocmd FileType java setlocal omnifunc=javacomplete#Complete
set completeopt-=preview

" echodoc
set cmdheight=2
let g:echodoc_enable_at_startup = 1

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
hi TabLine     cterm=none ctermfg=white ctermbg = none
hi TabLineSel  cterm=none ctermfg=black ctermbg = white
hi Visual      ctermfg=black
hi Search      ctermfg=black ctermbg=yellow

hi DiffAdd     ctermfg=black
hi DiffChange  ctermfg=black
hi DiffDelete  ctermfg=black
hi DiffText    ctermfg=black

hi SignColumn ctermbg=none
hi CursorColumn ctermbg=green
hi Pmenu ctermfg=darkgrey ctermbg=none
hi PmenuSbar ctermbg=none
hi PmenuThumb ctermfg=black ctermbg=darkgrey

" create directory if needed
if !isdirectory($HOME.'/.vim/files') && exists('*mkdir')
  call mkdir($HOME.'/.vim/files')
endif

try
" === Denite setup ==="
" Use ripgrep for searching current directory for files
" By default, ripgrep will respect rules in .gitignore
"   --files: Print each file that would be searched (but don't search)
"   --glob:  Include or exclues files for searching that match the given glob
"            (aka ignore .git files)
"
call denite#custom#var('file/rec', 'command', ['rg', '--files', '--glob', '!.git'])

" Use ripgrep in place of "grep"
call denite#custom#var('grep', 'command', ['rg'])

" Custom options for ripgrep
"   --vimgrep:  Show results with every match on it's own line
"   --hidden:   Search hidden directories and files
"   --heading:  Show the file name above clusters of matches from each file
"   --S:        Search case insensitively if the pattern is all lowercase
call denite#custom#var('grep', 'default_opts', ['--hidden', '--vimgrep', '--heading', '-S'])

" Recommended defaults for ripgrep via Denite docs
call denite#custom#var('grep', 'recursive_opts', [])
call denite#custom#var('grep', 'pattern_opt', ['--regexp'])
call denite#custom#var('grep', 'separator', ['--'])
call denite#custom#var('grep', 'final_opts', [])

" Remove date from buffer list
call denite#custom#var('buffer', 'date_format', '')

let s:denite_options = {'default' : {
\ 'auto_resize': 1,
\ 'prompt': '> ',
\ 'highlight_preview_line': 'Visual',
\ }}

" Loop through denite options and enable them
function! s:profile(opts) abort
  for l:fname in keys(a:opts)
    for l:dopt in keys(a:opts[l:fname])
      call denite#custom#option(l:fname, l:dopt, a:opts[l:fname][l:dopt])
    endfor
  endfor
endfunction

call s:profile(s:denite_options)
catch
  echo 'Denite not installed. It should work after running :PlugInstall'
endtry

" === Denite shorcuts === "
"   ;         - Browser currently open buffers
"   <leader>g - Search current directory for occurences of given term and close window if no results
"   <leader>j - Search current directory for occurences of word under cursor
nmap ; :Denite buffer<CR>
nnoremap <leader>g :<C-u>Denite grep:. -no-empty<CR>
nnoremap <leader>j :<C-u>DeniteCursorWord grep:.<CR>

" Define mappings while in 'filter' mode
"   <C-c>         - Switch to normal mode inside of search results
"   <Esc>         - Exit denite window in any mode
"   <CR>          - Open currently selected file in any mode
autocmd FileType denite-filter call s:denite_filter_my_settings()
function! s:denite_filter_my_settings() abort
  imap <silent><buffer> <C-c>
  \ <Plug>(denite_filter_quit)
  inoremap <silent><buffer><expr> <Esc>
  \ denite#do_map('quit')
  nnoremap <silent><buffer><expr> <Esc>
  \ denite#do_map('quit')
  inoremap <silent><buffer><expr> <CR>
  \ denite#do_map('do_action')
endfunction

" Define mappings while in denite window
"   <CR>        - Opens currently selected file
"   q or <Esc>  - Quit Denite window
"   dd          - Delete currenly selected file
"   P           - Preview currently selected file
"   <C-c> or i  - Switch to insert mode inside of filter prompt
"   o           - Open currently selected file in a new tab
"   v           - Open currently selected file a vertical split
"   s           - Open currently selected file in a horizontal split
autocmd FileType denite call s:denite_my_settings()
function! s:denite_my_settings() abort
  nnoremap <silent><buffer><expr> <CR>
  \ denite#do_map('do_action')
  nnoremap <silent><buffer><expr> q
  \ denite#do_map('quit')
  nnoremap <silent><buffer><expr> <Esc>
  \ denite#do_map('quit')
  nnoremap <silent><buffer><expr> p
  \ denite#do_map('do_action', 'preview')
  nnoremap <silent><buffer><expr> i
  \ denite#do_map('open_filter_buffer')
  nnoremap <silent><buffer><expr> o
  \ denite#do_map('do_action', 'tabopen')
  nnoremap <silent><buffer><expr> v
  \ denite#do_map('do_action', 'vsplit')
  nnoremap <silent><buffer><expr> h
  \ denite#do_map('do_action', 'split')
endfunction


" ================ Defx setup ====================
nmap <leader>t :Defx<cr>
call defx#custom#option('_', {
      \ 'winwidth': 30,
      \ 'split': 'vertical',
      \ 'direction': 'topleft',
      \ 'show_ignored_files': 0,
      \ 'buffer_name': 'defxplorer',
      \ 'toggle': 1,
      \ 'columns': 'icon:indent:icons:filename',
      \ 'resume': 1,
      \ })

call defx#custom#column('icon', {
      \ 'directory_icon': '▸',
      \ 'opened_icon': '▾',
      \ })

autocmd FileType defx call s:defx_my_settings()
function! s:defx_my_settings() abort
  " Define mappings
  nnoremap <silent><buffer><expr> <CR> defx#do_action('drop')
  nnoremap <silent><buffer><expr> l defx#do_action('drop')
  nnoremap <silent><buffer><expr> cp
  \ defx#do_action('copy')
  nnoremap <silent><buffer><expr> mv
  \ defx#do_action('move')
  nnoremap <silent><buffer><expr> p
  \ defx#do_action('paste')
  nnoremap <silent><buffer><expr> v
  \ defx#do_action('open', 'vsplit')
  nnoremap <silent><buffer><expr> o
  \ defx#do_action('open_or_close_tree')
  nnoremap <silent><buffer><expr> N
  \ defx#do_action('new_directory')
  nnoremap <silent><buffer><expr> n
  \ defx#do_action('new_file')
  nnoremap <silent><buffer><expr> dd
  \ defx#do_action('remove')
  nnoremap <silent><buffer><expr> r
  \ defx#do_action('rename')
  nnoremap <silent><buffer><expr> yy
  \ defx#do_action('yank_path')
  nnoremap <silent><buffer><expr> .
  \ defx#do_action('toggle_ignored_files')
  nnoremap <silent><buffer><expr> h
  \ defx#do_action('cd', ['..'])
  nnoremap <silent><buffer><expr> ~
  \ defx#do_action('cd')
  nnoremap <silent><buffer><expr> q
  \ defx#do_action('quit')
  nnoremap <silent><buffer><expr> <Space>
  \ defx#do_action('toggle_select')
  nnoremap <silent><buffer><expr> *
  \ defx#do_action('toggle_select_all')
  nnoremap <silent><buffer><expr> j
  \ line('.') == line('$') ? 'gg' : 'j'
  nnoremap <silent><buffer><expr> k
  \ line('.') == 1 ? 'G' : 'k'
  nnoremap <silent><buffer><expr> <C-g>
  \ defx#do_action('print')
  nnoremap <silent><buffer><expr> cd
  \ defx#do_action('change_vim_cwd')
endfunction
