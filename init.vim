set nocompatible

call plug#begin(stdpath('data') . '/plugged')

" movement
Plug 'easymotion/vim-easymotion'
Plug 'tpope/vim-surround'

" apperance
Plug 'Yggdroot/indentLine'

" GIT
Plug 'tpope/vim-fugitive'

" IDE like plugins
Plug 'neoclide/coc.nvim', {'branch': 'release'}
Plug 'iamcco/markdown-preview.nvim', { 'do': { -> mkdp#util#install() } }
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'
Plug 'honza/vim-snippets'
Plug 'liuchengxu/vim-which-key'

" syntax
Plug 'sheerun/vim-polyglot'

" colorscheme
Plug 'jeffkreeftmeijer/vim-dim'

" input source
Plug 'rlue/vim-barbaric'

" wiki
Plug 'vimwiki/vimwiki'

call plug#end()

" mappings
let g:mapleader = "\<Space>"
map <leader>rr :source ~/.config/nvim/init.vim<cr>
inoremap <C-c> <Esc>
inoremap <C-f> <Right>
inoremap <C-b> <Left>
inoremap <C-a> <Home>
inoremap <C-e> <End>

" basics
set nu
set ic
set ts=4
set sts=4
set sw=4
set expandtab
set undofile
set showtabline=2

" colors
colorscheme dim

hi TabLineFill cterm=none ctermfg=black ctermbg = none
hi TabLine     cterm=none ctermfg=grey ctermbg = none
hi TabLineSel  cterm=none ctermfg=white ctermbg = darkgrey
hi Visual      ctermfg=white ctermbg=darkgrey

hi SignColumn ctermbg=none
"hi StatusLine ctermbg=none
"hi StatusLineNC ctermbg=none
hi CursorColumn ctermfg=black ctermbg=yellow
"hi FoldColumn ctermbg=none
"hi Folded ctermbg=none

" system clipboard
set clipboard+=unnamed

" filetype
filetype plugin indent on
autocmd FileType jinja,j2 setlocal ts=2 sts=2 sw=2 expandtab
autocmd FileType yaml,yml setlocal ts=2 sts=2 sw=2 expandtab
autocmd FileType javascript setlocal ts=2 sts=2 sw=2 expandtab
autocmd Filetype json let g:indentLine_enabled = 0

" record cursor
au BufReadPost * if line("'\"") > 1 && line("'\"") <= line("$") | exe "normal! g'\"" | endif

" vim which key
nnoremap <silent> <leader> :WhichKey '<Space>'<CR>
set timeoutlen=500

" markdown preview
nmap <leader>pm <Plug>MarkdownPreviewToggle

" easymotion
let g:EasyMotion_smartcase = 1
map  <Leader>jj <Plug>(easymotion-bd-f)
nmap <Leader>jj <Plug>(easymotion-overwin-f)
map  <Leader>jw <Plug>(easymotion-bd-w)
nmap <Leader>jw <Plug>(easymotion-overwin-w)

" fzf
nnoremap <leader>g :<C-u>Rg <CR>
nnoremap <leader>G :<C-u>Ag <CR>
nnoremap <leader>f :<C-u>Files <CR>
nnoremap <leader>b  :<C-u>:Buffer<CR>
nnoremap <leader>m  :<C-u>:Marks<CR>
let g:fzf_preview_window = ''
let $FZF_DEFAULT_OPTS = '--layout=reverse'
let g:fzf_layout = { 'window': { 'width': 0.5, 'height': 0.5, 'highlight': 'Comment' } }

""""""""""""""""""""""""""""""""""""  cocnvim begin """""""""""""""""""""""""""""""""""""""""""""""
let g:coc_global_extensions = [
            \'coc-word', 'coc-emoji',
            \'coc-git', 'coc-snippets',
            \'coc-json', 'coc-eslint', 'coc-prettier', 'coc-tsserver'
            \]

set hidden
set nobackup
set nowritebackup
set cmdheight=2
set updatetime=300
set shortmess+=c
set signcolumn=yes
set statusline^=%{coc#status()}
set statusline^=%{get(b:,'coc_current_function','')}

imap <C-j> <Plug>(coc-snippets-expand-jump)
vmap <C-j> <Plug>(coc-snippets-select)

nmap <silent> gd <Plug>(coc-definition)
nmap <silent> gy <Plug>(coc-type-definition)
nmap <silent> gi <Plug>(coc-implementation)
nmap <silent> gr <Plug>(coc-references)

" symbol
nmap <leader>rn <Plug>(coc-rename)
autocmd CursorHold * silent call CocActionAsync('highlight')

" formatting selected code.
command! -nargs=0 Prettier :CocCommand prettier.formatFile
xmap = <Plug>(coc-format-selected)
nmap = <Plug>(coc-format-selected)
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

" use `[g` and `]g` to navigate diagnostics
nmap <silent> [g <Plug>(coc-diagnostic-prev)
nmap <silent> ]g <Plug>(coc-diagnostic-next)

" applying codeAction to the selected region.
xmap <leader>ac  <Plug>(coc-codeaction-selected)
nmap <leader>ac  <Plug>(coc-codeaction-selected)

" remap keys for applying codeAction to the current buffer.
nmap <leader>ac  <Plug>(coc-codeaction)
" Apply AutoFix to problem on the current line.
nmap <leader>qf  <Plug>(coc-fix-current)

command! -nargs=0 OR   :call     CocAction('runCommand', 'editor.action.organizeImport')
command! -nargs=? Fold :call     CocAction('fold', <f-args>)
""""""""""""""""""""""""""""""""""""  cocnvim end """""""""""""""""""""""""""""""""""""""""""""""""
