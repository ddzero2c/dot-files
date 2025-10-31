vim.lsp.config('gopls', {
  settings = {
    gopls = {
      env = { GOFLAGS = "-tags=wireinject" },
    }
  }
})
