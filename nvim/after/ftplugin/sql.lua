vim.bo.tabstop = 2
vim.bo.softtabstop = 2
vim.bo.shiftwidth = 2
vim.bo.expandtab = true
vim.bo.formatprg = 'pg_format'

vim.api.nvim_create_autocmd('BufWritePre', {
  buffer = 0,
  callback = function()
    local view = vim.fn.winsaveview()
    vim.cmd('silent %!pg_format')
    vim.fn.winrestview(view)
  end
})
