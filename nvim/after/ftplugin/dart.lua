vim.bo.tabstop = 2
vim.bo.softtabstop = 2
vim.bo.shiftwidth = 2
vim.bo.expandtab = true

vim.api.nvim_create_autocmd("BufWritePost", {
  pattern = "*.dart",
  callback = function()
    local flutter_pid = vim.fn.system("pgrep -f 'flutter_tools.snapshot run'"):gsub("%s+", "")
    if flutter_pid ~= "" then
      vim.fn.system("kill -USR1 " .. flutter_pid)
      return
    end
  end,
})
