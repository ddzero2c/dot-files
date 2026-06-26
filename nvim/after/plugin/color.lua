vim.api.nvim_create_autocmd("OptionSet", {
  pattern = "background",
  callback = function()
    vim.notify("Colorscheme changed to " .. vim.o.background)
    if vim.o.background == 'dark' then
      vim.api.nvim_set_hl(0, 'DiffAdd', { bg = '#001B29' })
      vim.api.nvim_set_hl(0, 'DiffDelete', { bg = '#3D0100' })
      vim.api.nvim_set_hl(0, 'DiffChange', { bg = '#003047' })
      vim.api.nvim_set_hl(0, 'DiffText', { bg = '#004a70' })
      vim.api.nvim_set_hl(0, 'IndentLine', { fg = '#383838' })
      vim.api.nvim_set_hl(0, 'IndentLineCurrent', { fg = '#888888' })
      vim.api.nvim_set_hl(0, 'TrailingWhitespace', { bg = '#5c2020' })
      vim.api.nvim_set_hl(0, 'String', { bg = '#3a3a3a' })
      vim.api.nvim_set_hl(0, 'Statement', { fg = 'NvimLightGray4', bold = true })
      vim.api.nvim_set_hl(0, 'Special', { fg = '#6a91bc', bold = true })
      vim.api.nvim_set_hl(0, 'Type', { bold = true })
      vim.api.nvim_set_hl(0, 'Constant', { bold = true, italic = true })
      vim.api.nvim_set_hl(0, 'Comment', { fg = 'NvimLightGray4', italic = true })
    else
      vim.api.nvim_set_hl(0, 'IndentLine', { fg = '#DAD7CC' })
      vim.api.nvim_set_hl(0, 'IndentLineCurrent', { fg = '#9E9A8E' })
      vim.api.nvim_set_hl(0, 'TrailingWhitespace', { bg = '#F2D9CD' })
      vim.api.nvim_set_hl(0, 'String', { bg = '#F4F1E9' })
      vim.api.nvim_set_hl(0, 'Statement', { fg = '#2B2A27', bold = true })
      vim.api.nvim_set_hl(0, 'Special', { fg = '#5A7290', bold = true })
      vim.api.nvim_set_hl(0, 'Type', { bold = true })
      vim.api.nvim_set_hl(0, 'Constant', { bold = true, italic = true })
      vim.api.nvim_set_hl(0, 'Comment', { fg = '#8C887C', italic = true })
      vim.api.nvim_set_hl(0, 'Visual', { bg = '#EDEAE2' })
      vim.api.nvim_set_hl(0, 'Cursor', { bg = '#D97757' })
    end

    -- ui
    vim.api.nvim_set_hl(0, 'Normal', {})
    vim.api.nvim_set_hl(0, 'NormalFloat', {})
    -- vim.api.nvim_set_hl(0, 'Pmenu', { bg = '#444444' })
    vim.api.nvim_set_hl(0, "TabLine", {})

    local highlight_links = {
      String = { '@string', '@string.special', '@string.escape', 'goFormatSpecifier' },
      Normal = { 'Identifier', 'Delimiter', 'Function', '@constructor', 'RenderMarkdownCode' },
      NormalFloat = { 'Pmenu' },
      LineNr = { 'SignColumn', 'RenderMarkdownCodeBorder', 'TreesitterContextSeparator' },
      Constant = { 'Character', 'Number', 'Boolean', 'Float', '@constant' },
      Special = { 'Operator' },
      Visual = { 'TabLineSel', 'StatusLine', 'PmenuSel', 'TelescopeMatching', 'QuickFixLine' },
      Statement = { 'PreProc' },
      DiffAdd = { 'GitSignsAdd', 'GitSignsAddLn', 'GitSignsAddPreview', 'GitSignsAddInline' },
      DiffDelete = { 'GitSignsDelete', 'GitSignsTopDelete', 'GitSignsDeleteLn', 'GitSignsDeletePreview', 'GitSignsDeleteVirtLn', 'GitSignsDeleteInline' },
      DiffChange = { 'GitSignsChange', 'GitSignsChangeDelete', 'GitSignsChangeLn', 'GitSignsChangePreview' },
    }

    for to, entries in pairs(highlight_links) do
      for _, from in ipairs(entries) do
        vim.api.nvim_set_hl(0, from, { link = to })
      end
    end
  end,
})
