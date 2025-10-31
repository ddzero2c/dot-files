vim.pack.add({
  { src = "https://github.com/mason-org/mason.nvim.git" },
  { src = "https://github.com/neovim/nvim-lspconfig.git" },
  { src = "https://github.com/nvimtools/none-ls.nvim" },
  { src = "https://github.com/nvimtools/none-ls-extras.nvim" },
  { src = "https://github.com/mfussenegger/nvim-dap" },
  { src = "https://github.com/Saghen/blink.cmp",                           version = "v1.7.0" },
  { src = "https://github.com/supermaven-inc/supermaven-nvim" },
  { src = "https://github.com/coder/claudecode.nvim" },
  { src = "https://github.com/nvim-lua/plenary.nvim" },
  { src = "https://github.com/nvim-treesitter/nvim-treesitter" },
  { src = "https://github.com/nvim-treesitter/nvim-treesitter-context" },
  { src = "https://github.com/nvim-treesitter/nvim-treesitter-textobjects" },
  { src = "https://github.com/junegunn/fzf" },
  { src = "https://github.com/junegunn/fzf.vim" },
  { src = "https://github.com/tpope/vim-fugitive" },
  { src = "https://github.com/tpope/vim-surround" },
  { src = "https://github.com/tpope/vim-repeat" },
  { src = "https://github.com/nvimdev/indentmini.nvim" },
  { src = "https://github.com/lewis6991/gitsigns.nvim" },
  { src = "https://github.com/stevearc/oil.nvim" },
  { src = "https://github.com/uga-rosa/ccc.nvim" },
})
require("mason").setup()
local null_ls = require('null-ls')
null_ls.setup({
  sources = {
    null_ls.builtins.diagnostics.trail_space,
    null_ls.builtins.formatting.pg_format,
    -- require("none-ls.diagnostics.eslint"),
  },
  -- debug = true,
})
require("blink.cmp").setup({
  keymap = { preset = 'default' },
  signature = { enabled = true, trigger = { enabled = true } },
  appearance = {
    nerd_font_variant = 'mono'
  },
  completion = {
    list = {
      selection = { preselect = true, auto_insert = true, }
    },
    documentation = { auto_show = true },
    ghost_text = { enabled = false },
    keyword = { range = 'prefix' },
    menu = {
      scrollbar = false,
      draw = {
        columns = {
          { "label",     "label_description", gap = 1 },
          { "kind_icon", "source_name",       gap = 1 },
        },
      }
    },
  },
  sources = {
    default = { 'lsp', 'path', 'buffer' },
  },
  fuzzy = { implementation = "lua" }
})
require("supermaven-nvim").setup({
  keymaps = {
    accept_suggestion = "<C-j>",
    clear_suggestion = "<C-e>",
    accept_word = "<M-j>",
  },
})
require("claudecode").setup({
  diff_opts = { vertical_split = false, },
  terminal = {
    provider = "external",
    provider_opts = {
      external_terminal_cmd = "echo 'Claude running externally' # %s" -- Dummy command
    }
  }
})
require('nvim-treesitter.configs').setup({
  sync_install = false,
  auto_install = true,
  ignore_install = {},
  highlight = {
    enable = true,
    additional_vim_regex_highlighting = false,
  },
  textobjects = {
    select = {
      enable = true,
      lookahead = true,
      keymaps = {
        ["ia"] = "@parameter.inner",
        ["aa"] = "@parameter.outer",
      },
    },
  },
})
require('treesitter-context').setup({
  max_lines = 1, -- How many lines the window should span. Values <= 0 mean no limit.
  trim_scope = 'inner',
  mode = 'topline',
  separator = '─'
})
require('indentmini').setup({})
require('gitsigns').setup({
  current_line_blame = false,
  current_line_blame_opts = {
    delay = 250,
    virt_text_pos = "eol",
  },
})
require('oil').setup({
  use_default_keymaps = false,
  keymaps = {
    ["<CR>"] = "actions.select",
  }
})
require('ccc').setup({ highlighter = { auto_enable = true, lsp = true } })

-- settings
vim.g.mapleader = " "
vim.o.number = true
vim.o.relativenumber = true
vim.o.signcolumn = "yes:1"
vim.o.mouse = "n"
vim.o.undofile = true
vim.o.clipboard = "unnamed,unnamedplus"
vim.o.ignorecase = true
vim.o.smartcase = true
vim.o.tabstop = 4
vim.o.softtabstop = 4
vim.o.shiftwidth = 4
vim.o.expandtab = false
vim.o.winborder = 'single'
vim.o.termguicolors = true
vim.o.statusline = "%<%f %h%m%r %= %{v:lua.lsp_status_all()} %=%-14.(%l,%c%V%) %P"
_G.lsp_status_all = function()
  local c = vim.lsp.get_clients({ bufnr = 0 })
  return #c > 0 and table.concat(vim.tbl_map(function(x) return x.name end, c), ", ") or ""
end

vim.diagnostic.config({
  virtual_text = { source = true },
  float = { source = true, focusable = true },
  signs = true,
  underline = true,
  update_in_insert = false,
  severity_sort = false
})
vim.lsp.enable({ "lua_ls", "gopls", "dartls" })


-- keymaps
vim.keymap.set("n", "<leader>p", '<cmd>Files<cr>', { desc = 'Fuzzy finder' })
vim.keymap.set('n', '<leader>a', '<cmd>ClaudeCodeStatus<cr>', { desc = 'Claude Code' })
vim.keymap.set('n', '<leader>b', '<cmd>DapToggleBreakpoint<cr>', { desc = "Breakpoint" })
vim.keymap.set('n', '<F5>', '<cmd>DapContinue<cr>', { desc = "Start Debugging" })
vim.keymap.set('n', '<F4>', '<cmd>DapTerminate<cr>', { desc = "Stop Debugging" })
vim.keymap.set('v', 'ga', '<cmd>ClaudeCodeSend<cr>', { desc = 'Send to Claude' })
vim.keymap.set('n', 'ga', '<cmd>ClaudeCodeAdd %<cr>', { desc = 'Add current buffer' })
vim.keymap.set('n', 'gy', '<cmd>ClaudeCodeDiffAccept<cr>', { desc = 'Accept diff' })
vim.keymap.set('n', 'gn', '<cmd>ClaudeCodeDiffDeny<cr>', { desc = 'Deny diff' })


-- autocmds
vim.api.nvim_create_autocmd("BufReadPost", {
  pattern = "*",
  callback = function()
    local mark = vim.api.nvim_buf_get_mark(0, '"')
    local lcount = vim.api.nvim_buf_line_count(0)
    if mark[1] > 1 and mark[1] <= lcount then
      pcall(vim.api.nvim_win_set_cursor, 0, mark)
    end
  end
})

vim.api.nvim_create_autocmd('LspAttach', {
  callback = function(args)
    -- grn in Normal mode maps to vim.lsp.buf.rename()
    -- grr in Normal mode maps to vim.lsp.buf.references()
    -- gri in Normal mode maps to vim.lsp.buf.implementation()
    -- gO in Normal mode maps to vim.lsp.buf.document_symbol()
    -- gra in Normal and Visual mode maps to vim.lsp.buf.code_action()
    -- CTRL-S in Insert and Select mode maps to vim.lsp.buf.signature_help()
    -- [d and ]d move between diagnostics in the current buffer ([D jumps to the first diagnostic, ]D jumps to the last)

    -- [q, ]q, [Q, ]Q, [CTRL-Q, ]CTRL-Q navigate through the quickfix list
    -- [l, ]l, [L, ]L, [CTRL-L, ]CTRL-L navigate through the location list
    -- [t, ]t, [T, ]T, [CTRL-T, ]CTRL-T navigate through the tag matchlist
    -- [a, ]a, [A, ]A navigate through the argument list
    -- [b, ]b, [B, ]B navigate through the buffer list
    vim.defer_fn(function()
      if vim.lsp.inlay_hint then
        vim.lsp.inlay_hint.enable(false, { bufnr = args.buf })
      end
    end, 100)
    local opts = { buffer = args.buf }
    vim.keymap.set("n", "gd", vim.lsp.buf.definition, opts)
    vim.keymap.set("n", "<leader>f", vim.lsp.buf.format, opts)
    vim.keymap.set("n", "<leader>e", vim.diagnostic.open_float, opts)
    vim.keymap.set("n", "<leader>q", vim.diagnostic.setqflist, opts)
    vim.keymap.set("n", "<C-p>", vim.diagnostic.goto_prev, opts)
    vim.keymap.set("n", "<C-n>", vim.diagnostic.goto_next, opts)

    local augroup = vim.api.nvim_create_augroup("LspFormatting", {})
    vim.api.nvim_clear_autocmds({ group = augroup, buffer = args.buf })
    vim.api.nvim_create_autocmd("BufWritePre", {
      group = augroup,
      buffer = args.buf,
      callback = function()
        vim.lsp.buf.format({ bufnr = args.buf })
      end,
    })
  end,
})
