set nocompatible
call plug#begin(stdpath('data') . '/plugged')

" movement
Plug 'easymotion/vim-easymotion'
Plug 'tpope/vim-surround'
Plug 'tpope/vim-repeat'

" IDE like plugins
Plug 'neoclide/coc.nvim', {'branch': 'release'}
Plug 'iamcco/markdown-preview.nvim', { 'do': { -> mkdp#util#install() }, 'for': ['markdown', 'vim-plug']}
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'
Plug 'honza/vim-snippets'
Plug 'liuchengxu/vim-which-key'
Plug 'Yggdroot/indentLine'
Plug 'tpope/vim-fugitive'
Plug 'markonm/traces.vim'

" wiki
Plug 'vimwiki/vimwiki'
Plug 'SidOfc/mkdx'
let g:mkdx#settings     = { 'highlight': { 'enable': 1 },
                      \ 'enter': { 'shift': 1 },
                      \ 'links': { 'external': { 'enable': 1 } },
                      \ 'toc': { 'text': 'Table of Contents', 'update_on_write': 1 },
                      \ 'fold': { 'enable': 0 } }


" syntax
let g:polyglot_disabled = ['markdown', 'vimwiki']
Plug 'sheerun/vim-polyglot'
Plug 'nikvdp/ejs-syntax'

" color
Plug 'alexanderjeurissen/lumiere.vim'

" input source
Plug 'rlue/vim-barbaric'

" web
Plug 'raghur/vim-ghost', {'do': ':GhostInstall'}

call plug#end()
" mappings
let g:mapleader = "\<Space>"
map <leader>rr :source ~/.config/nvim/init.vim<cr>
inoremap <C-c> <Esc>
"inoremap <C-f> <Right>
"inoremap <C-b> <Left>
"inoremap <C-a> <Home>
"inoremap <C-e> <End>

" basics
set nu
set ic
set ts=2
set sts=2
set sw=2
set expandtab
set undofile
set showtabline=2
set termguicolors

" colors
let g:lumiere_bold = 1
let g:lumiere_inverse = 1
let g:lumiere_dim_inactive_windows = 1
let g:lumiere_italic = 0
let g:lumiere_invert_selection = 1
colorscheme lumiere

"hi SignColumn ctermbg=none
"hi StatusLine ctermbg=none
"hi StatusLineNC ctermbg=none
"hi CursorColumn ctermfg=black ctermbg=yellow
"hi FoldColumn ctermbg=none
"hi Folded ctermbg=none
"hi DiffAdd cterm=bold ctermbg=lightblue
"hi DiffChange cterm=bold ctermbg=lightgreen
"hi DiffDelete cterm=none ctermfg=grey ctermbg=lightred
"hi DiffText cterm=bold ctermbg=yellow
"hi! link LineNr Conceal
"hi! link TabLineSel StatusLine
"hi! link TabLineFill Conceal
"hi! link TabLine Conceal
"hi! link Constant Keyword
"hi! link Special Keyword
hi Special gui=bold guifg=#000000
hi Identifier gui=bold guifg=#000000
hi Normal guifg=#000000
hi String guifg=#2b2b2b guibg=#dedcd6
hi! link Number MoreMsg
hi! link Operator MoreMsg
hi! link Comment Conceal
hi! link CocErrorSign ErrorMsg
hi! link CocWarningSign WarningMsg
hi! link CocInfoSign InfoMsg
hi! link CocHintSign HintMsg


" system clipboard
set clipboard+=unnamed

" filetype
filetype plugin indent on
" autocmd FileType jinja,j2 setlocal ts=2 sts=2 sw=2 expandtab
autocmd FileType javascript,typescript,json,qraphql,yaml setlocal ts=2 sts=2 sw=2 expandtab
autocmd Filetype json let g:indentLine_enabled=0 
autocmd FileType json syntax match Comment +\/\/.\+$+

" record cursor
au BufReadPost * if line("'\"") > 1 && line("'\"") <= line("$") | exe "normal! g'\"" | endif

" vim ghost
let g:ghost_darwin_app = 'Terminal'
function! s:SetupGhostBuffer()
    if match(expand("%:a"), '\v/ghost-(github|reddit)\.com-')
        set ft=markdown
    elseif match(expand("%:a"), '\v/ghost-hackmd.io-')
    endif
endfunction
augroup vim-ghost
    au!
    au User vim-ghost#connected call s:SetupGhostBuffer()
augroup END
nmap <Leader>vgs :GhostStart<CR>
nmap <Leader>vgS :GhostStop<CR>
nmap <Leader>vgq :bd!<CR>

" statusline
set statusline=
set statusline+=%{coc#status()}
set statusline+=%2*\ %<%F\                                "File+path
set statusline+=%3*\ %=\ %{''.(&fenc!=''?&fenc:&enc).''}\ "Encoding
set statusline+=%4*\ %{(&bomb?\",BOM\":\"\")}\            "Encoding2
set statusline+=%5*\ %{&ff}\                              "FileFormat (dos/unix..)
set statusline+=%6*\ row:%l/%L\ col:%03c\ (%03p%%)\             "Rownumber/total (%)
set statusline+=%0*\ \ %m%r%w\ %P\ \                      "Modified? Readonly? Top/bot.

" vim which key
nnoremap <silent> <leader> :WhichKey '<Space>'<CR>
set timeoutlen=300
autocmd! FileType which_key
autocmd  FileType which_key set laststatus=0 noshowmode noruler
  \| autocmd BufLeave <buffer> set laststatus=2 showmode ruler

" markdown preview
nmap <leader>mps <Plug>MarkdownPreview
nmap <leader>mpS <Plug>MarkdownPreviewStop

" fzf
nnoremap <leader>p :<C-u>Files <CR>
nnoremap <leader>fb  :<C-u>:Buffer<CR>
nnoremap <leader>fm  :<C-u>:Marks<CR>
let g:fzf_preview_window = ''
let $FZF_DEFAULT_OPTS = '--layout=reverse'
let g:fzf_layout = { 'window': { 'width': 0.8, 'height': 0.8, 'highlight': 'Comment' } }

" motion
map  s <Plug>(easymotion-bd-f)
nmap s <Plug>(easymotion-overwin-f)

" wiki
let g:vimwiki_list = [{'path': '~/vimwiki/',
                    \ 'syntax': 'markdown', 'ext': '.md'}]

let g:coc_global_extensions = [
            \'coc-highlight', 'coc-stylelint', 'coc-html', 'coc-css',
            \'coc-word', 'coc-emoji', 'coc-snippets',
            \'coc-json', 'coc-yaml',
            \'coc-prettier', 'coc-eslint', 'coc-tsserver'
            \]

" coc-translator
nmap <leader>t <Plug>(coc-translator-p)
vmap <leader>t <Plug>(coc-translator-pv)

hi! link CocHighlightText StatusLine
set hidden
set nobackup
set nowritebackup
set cmdheight=1
set updatetime=300
set shortmess+=c
set signcolumn=yes

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
nnoremap <silent><nowait> <leader>dg  :<C-u>CocList diagnostics<cr>

" applying codeAction to the selected region.
xmap <leader>a  <Plug>(coc-codeaction-selected)
nmap <leader>a  <Plug>(coc-codeaction-selected)

" remap keys for applying codeAction to the current buffer.
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

" Remap <C-f> and <C-b> for scroll float windows/popups.
" Note coc#float#scroll works on neovim >= 0.4.0 or vim >= 8.2.0750
nnoremap <nowait><expr> <C-f> coc#float#has_scroll() ? coc#float#scroll(1) : "\<C-f>"
nnoremap <nowait><expr> <C-b> coc#float#has_scroll() ? coc#float#scroll(0) : "\<C-b>"
inoremap <nowait><expr> <C-f> coc#float#has_scroll() ? "\<c-r>=coc#float#scroll(1)\<cr>" : "\<Right>"
inoremap <nowait><expr> <C-b> coc#float#has_scroll() ? "\<c-r>=coc#float#scroll(0)\<cr>" : "\<Left>"

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

" Add (Neo)Vim's native statusline support.
" NOTE: Please see `:h coc-status` for integrations with external plugins that
" provide custom statusline: lightline.vim, vim-airline.
set statusline^=%{coc#status()}%{get(b:,'coc_current_function','')}
