call plug#begin(stdpath('data') . '/plugged')

" classic
Plug 'tpope/vim-surround'
Plug 'tpope/vim-repeat'
Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-rhubarb' " :Gbrowse Github supported
Plug 'tpope/vim-unimpaired'

" IDE like plugins
Plug 'neoclide/coc.nvim', {'branch': 'release'}
Plug 'honza/vim-snippets'
Plug 'Yggdroot/indentLine'
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'
Plug 'liuchengxu/vim-which-key'
Plug 'diepm/vim-rest-console'
let g:vrc_trigger = '<c-y>'
Plug 'ntpeters/vim-better-whitespace'

Plug 'AndrewRadev/tagalong.vim', {'branch': 'main'}

" markdown
Plug 'iamcco/markdown-preview.nvim', { 'do': { -> mkdp#util#install() }, 'for': ['markdown', 'vim-plug']}
Plug 'SidOfc/mkdx'
let g:mkdx#settings = { 'highlight': { 'enable': 1 },
                      \ 'enter': { 'shift': 1 },
                      \ 'links': { 'external': { 'enable': 1 } },
                      \ 'toc': { 'text': 'Table of Contents', 'update_on_write': 1 },
                      \ 'fold': { 'enable': 0 } }

" syntax
let g:polyglot_disabled = ['markdown']
Plug 'sheerun/vim-polyglot'
Plug 'nikvdp/ejs-syntax'

" color
Plug 'alexanderjeurissen/lumiere.vim', {'branch': 'main'}
Plug 'jeffkreeftmeijer/vim-dim'

" input source
Plug 'rlue/vim-barbaric'

" Pair programming
Plug 'jbyuki/instant.nvim'
let g:instant_username = "Ryder"

" nvim-nightly only
" scrollview
Plug 'dstein64/nvim-scrollview', { 'branch': 'main' }
Plug 'nvim-treesitter/nvim-treesitter', {'do': ':TSUpdate'}

call plug#end()

" nvim-ngihtly only
lua << EOF
local treesitter = require'nvim-treesitter.configs'
treesitter.setup {
  ensure_installed = {"typescript", "html", "tsx", "lua", "json", "rust", "css", "javascript"},
  highlight = {
    enable = true,
  },
}
EOF

" mappings
let g:mapleader = "\<Space>"
map <leader>rr :source ~/.config/nvim/init.vim<cr>
inoremap <C-c> <Esc>
" vim which key
nnoremap <silent> <leader> :WhichKey '<Space>'<CR>
set timeoutlen=300
autocmd! FileType which_key
autocmd  FileType which_key set laststatus=0 noshowmode noruler
  \| autocmd BufLeave <buffer> set laststatus=2 showmode ruler

" basics
set nu
set ic
set ts=2
set sts=2
set sw=2
set mouse=a
set expandtab
set undofile
set showtabline=2
set signcolumn=yes
set termguicolors
set icm=nosplit " live preview

" colors
"colorscheme dim
"hi TabLineFill cterm=none ctermfg=black ctermbg = none
"hi TabLine     cterm=none ctermfg=grey ctermbg = none
"hi TabLineSel  cterm=none ctermfg=white ctermbg = darkgrey
"hi! link ScrollView Pmenu
"hi SignColumn ctermbg=none

colorscheme lumiere
hi Special gui=bold guifg=#000000
hi Identifier gui=bold guifg=#000000
hi Normal guifg=#000000
hi String guifg=#2b2b2b guibg=#dedcd6
hi Comment gui=italic guifg=#424242 guibg=#F1F1F1
hi! link Number MoreMsg
hi! link Operator MoreMsg
" fix coc.nvim
hi! link CocErrorSign ErrorMsg
hi! link CocWarningSign WarningMsg
hi! link CocInfoSign InfoMsg
hi! link CocHintSign HintMsg
hi! link CocHighlightText StatusLine

" system clipboard
set clipboard+=unnamed

" filetype
"filetype plugin indent on
" autocmd FileType jinja,j2 setlocal ts=2 sts=2 sw=2 expandtab
" autocmd FileType javascript,typescript,json,qraphql,yaml setlocal ts=2 sts=2 sw=2 expandtab
" autocmd Filetype json let g:indentLine_enabled=0 
autocmd FileType json syntax match Comment +\/\/.\+$+

" record cursor
au BufReadPost * if line("'\"") > 1 && line("'\"") <= line("$") | exe "normal! g'\"" | endif

" hightlight on yank
augroup LuaHighlight 
    autocmd!
    autocmd TextYankPost * silent! lua require'vim.highlight'.on_yank()
augroup END

" statusline
set statusline=
set statusline+=%{coc#status()}
set statusline+=\ %<%F\                                "File+path
set statusline+=%=(%{FugitiveHead()})
set statusline+=\ %{&fileencoding?&fileencoding:&encoding}
set statusline+=/%{&fileformat}
set statusline+=\ %l:%c

" markdown preview
nmap <leader>md <Plug>MarkdownPreviewToggle
let g:mkdp_markdown_css = 'github-markdown.css'

" fzf
nnoremap <leader>p :<C-u>Files <CR>
let g:fzf_preview_window = ''
let $FZF_DEFAULT_OPTS = '--layout=reverse --no-preview'
let g:fzf_layout = { 'window': { 'width': 0.5, 'height': 0.5, 'highlight': 'Comment' } }

" coc.nvim
let g:coc_global_extensions = [
            \'coc-highlight', 'coc-stylelint', 'coc-html', 'coc-css', 'coc-explorer',
            \'coc-word', 'coc-emoji', 'coc-snippets',
            \'coc-json', 'coc-yaml',
            \'coc-prettier', 'coc-eslint', 'coc-tsserver', 'coc-styled-components', 'coc-react-refactor',
            \'coc-solargraph']
nmap <space>t :CocCommand explorer<CR>

set hidden
set nobackup
set nowritebackup
set cmdheight=1
set updatetime=300
set shortmess+=c

imap <C-j> <Plug>(coc-snippets-expand-jump)
vmap <C-j> <Plug>(coc-snippets-select)

nmap <silent> gd <Plug>(coc-definition)
nmap <silent> gi <Plug>(coc-implementation)
nmap <silent> gy <Plug>(coc-type-definition)
nmap <silent> gr <Plug>(coc-references)

" symbol
nmap <leader>rn <Plug>(coc-rename)
autocmd CursorHold * silent call CocActionAsync('highlight')

" Formatting selected code.
xmap <leader>f  <Plug>(coc-format-selected)
nmap <leader>f  <Plug>(coc-format-selected)
command! -nargs=0 Prettier :CocCommand prettier.formatFile

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
  elseif (coc#rpc#ready())
    call CocActionAsync('doHover')
  else
    execute '!' . &keywordprg . " " . expand('<cword>')
  endif
endfunction

" use `[g` and `]g` to navigate diagnostics
nmap <silent> [g <Plug>(coc-diagnostic-prev)
nmap <silent> ]g <Plug>(coc-diagnostic-next)
nnoremap <silent><nowait> <leader>dg  :<C-u>CocList diagnostics<cr>

xmap <leader>a  <Plug>(coc-codeaction-selected)
vmap <leader>a  <Plug>(coc-codeaction-selected)
nmap <leader>a  <Plug>(coc-codeaction)
nmap <leader>qf  <Plug>(coc-fix-current)
inoremap <silent><expr> <c-space> coc#refresh()

" Remap <C-f> and <C-b> for scroll float windows/popups.
if has('nvim-0.4.0') || has('patch-8.2.0750')
  nnoremap <silent><nowait><expr> <C-f> coc#float#has_scroll() ? coc#float#scroll(1) : "\<C-f>"
  nnoremap <silent><nowait><expr> <C-b> coc#float#has_scroll() ? coc#float#scroll(0) : "\<C-b>"
  inoremap <silent><nowait><expr> <C-f> coc#float#has_scroll() ? "\<c-r>=coc#float#scroll(1)\<cr>" : "\<Right>"
  inoremap <silent><nowait><expr> <C-b> coc#float#has_scroll() ? "\<c-r>=coc#float#scroll(0)\<cr>" : "\<Left>"
  vnoremap <silent><nowait><expr> <C-f> coc#float#has_scroll() ? coc#float#scroll(1) : "\<C-f>"
  vnoremap <silent><nowait><expr> <C-b> coc#float#has_scroll() ? coc#float#scroll(0) : "\<C-b>"
endif

" NeoVim-only mapping for visual mode scroll
" Useful on signatureHelp after jump placeholder of snippet expansion
if has('nvim')
  vnoremap <nowait><expr> <C-f> coc#float#has_scroll() ? coc#float#nvim_scroll(1, 1) : "\<C-f>"
  vnoremap <nowait><expr> <C-b> coc#float#has_scroll() ? coc#float#nvim_scroll(0, 1) : "\<C-b>"
endif

" Add `:Format` command to format current buffer.
command! -nargs=0 Format :call CocAction('format')

" Add `:Fold` command to fold current buffer.
command! -nargs=? Fold :call     CocAction('fold', <f-args>)

" Add `:OR` command for organize imports of the current buffer.
command! -nargs=0 OR   :call     CocAction('runCommand', 'editor.action.organizeImport')

" coc-git
" create text object for git chunks
omap ig <Plug>(coc-git-chunk-inner)
xmap ig <Plug>(coc-git-chunk-inner)
omap ag <Plug>(coc-git-chunk-outer)
xmap ag <Plug>(coc-git-chunk-outer)
" navigate chunks of current buffer
nmap [g <Plug>(coc-git-prevchunk)
nmap ]g <Plug>(coc-git-nextchunk)
" navigate conflicts of current buffer
nmap [c <Plug>(coc-git-prevconflict)
nmap ]c <Plug>(coc-git-nextconflict)

inoremap <silent><expr> <TAB>
      \ pumvisible() ? "\<C-n>" :
      \ <SID>check_back_space() ? "\<TAB>" :
      \ coc#refresh()
inoremap <expr><S-TAB> pumvisible() ? "\<C-p>" : "\<C-h>"

function! s:check_back_space() abort
  let col = col('.') - 1
  return !col || getline('.')[col - 1]  =~# '\s'
endfunction
