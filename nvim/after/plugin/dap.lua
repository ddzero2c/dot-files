local dap, dapui = require("dap"), require("dapui")
vim.fn.sign_define("DapBreakpoint", { text = "•", texthl = "ErrorMsg", linehl = "", numhl = "" })
vim.fn.sign_define("DapStopped", { text = "→", texthl = "ErrorMsg", linehl = "", numhl = "Error" })
dapui.setup({
  icons = { expanded = "▼", collapsed = "⏵", circular = "" },
  layouts = {
    {
      elements = {
        "stacks",
        "scopes",
        "repl",
      },
      size = 12,
      position = "bottom",
    },
  },
})
dap.listeners.after.event_initialized['dapui_config'] = function()
  dapui.open()
  vim.keymap.set('n', 'p', dapui.eval, { silent = true })
  vim.keymap.set('n', 'n', dap.step_over, { silent = true })
  vim.keymap.set('n', 'i', dap.step_into, { silent = true })
  vim.keymap.set('n', 'o', dap.step_out, { silent = true })
  vim.keymap.set('n', 'b', dap.toggle_breakpoint, { silent = true })
  vim.keymap.set('n', 'c', dap.continue, { silent = true })
end
dap.listeners.before.event_terminated['dapui_config'] = function()
  vim.keymap.del('n', 'p', {})
  vim.keymap.del('n', 'n', {})
  vim.keymap.del('n', 'i', {})
  vim.keymap.del('n', 'o', {})
  vim.keymap.del('n', 'b', {})
  vim.keymap.del('n', 'c', {})
  dapui.close()
end
