vim.api.nvim_create_autocmd("OptionSet", {
  pattern = "background",
  callback = function()
    vim.notify("Colorscheme changed to " .. vim.v.option_new)
    if vim.v.option_new == 'dark' then
      vim.api.nvim_set_hl(0, 'String', { fg = 'none', bg = '#3a3a3a' })
      vim.api.nvim_set_hl(0, 'Statement', { fg = 'NvimLightGray4', bold = true })
      vim.api.nvim_set_hl(0, 'Special', { fg = '#6a91bc', bold = true })
      vim.api.nvim_set_hl(0, 'Type', { fg = 'none', bold = true })
      vim.api.nvim_set_hl(0, 'Constant', { bold = true, italic = true })
      vim.api.nvim_set_hl(0, 'Comment', { fg = 'NvimLightGray4', italic = true })
    else
      vim.api.nvim_set_hl(0, 'String', { fg = 'none', bg = '#e3e3e3' })
      vim.api.nvim_set_hl(0, 'Statement', { fg = 'NvimDarkGray4', bold = true })
      vim.api.nvim_set_hl(0, 'Special', { fg = '#6a91bc', bold = true })
      vim.api.nvim_set_hl(0, 'Type', { bold = true })
      vim.api.nvim_set_hl(0, 'Constant', { bold = true, italic = true })
      vim.api.nvim_set_hl(0, 'Comment', { fg = 'NvimDarkGray4', italic = true })
      vim.api.nvim_set_hl(0, 'Visual', { bg = 'NvimLightGray3' })
      vim.api.nvim_set_hl(0, 'Cursor', { bg = 'NvimDarkGray3' })
    end

    -- ui
    vim.api.nvim_set_hl(0, 'Normal', {})
    vim.api.nvim_set_hl(0, 'NormalFloat', {})
    -- vim.api.nvim_set_hl(0, 'Pmenu', { bg = '#444444' })
    vim.api.nvim_set_hl(0, "TabLine", {})

    local highlight_links = {
      Normal = { 'Identifier', 'Delimiter', 'Function', '@constructor', 'RenderMarkdownCode' },
      NormalFloat = { 'Pmenu' },
      Comment = { 'IndentLine' },
      Constant = { 'Character', 'Number', 'Boolean', 'Float', '@constant' },
      Special = { 'Operator' },
      Visual = { 'TabLineSel', 'StatusLine', 'PmenuSel', 'TelescopeMatching', 'QuickFixLine' },
      Statement = { 'PreProc' },
      LineNr = { 'SignColumn', 'RenderMarkdownCodeBorder', 'TreesitterContextSeparator' },
    }

    for to, entries in pairs(highlight_links) do
      for _, from in ipairs(entries) do
        vim.api.nvim_set_hl(0, from, { link = to })
      end
    end
  end,
})
