local accent = '#D97757'

local highlight_links = {
  String = { '@string', '@string.special', '@string.escape', 'goFormatSpecifier' },
  Normal = { 'Identifier', 'Delimiter', 'Function', '@constructor', 'RenderMarkdownCode' },
  NormalFloat = { 'Pmenu' },
  LineNr = { 'SignColumn', 'RenderMarkdownCodeBorder', 'TreesitterContextSeparator' },
  Constant = { 'Character', 'Number', 'Boolean', 'Float', '@constant' },
  Special = { 'Operator' },
  Visual = { 'TabLineSel', 'PmenuSel', 'TelescopeMatching', 'QuickFixLine' },
  Statement = { 'PreProc' },
  DiffAdd = { 'GitSignsAdd', 'GitSignsAddLn', 'GitSignsAddPreview', 'GitSignsAddInline' },
  DiffDelete = { 'GitSignsDelete', 'GitSignsTopDelete', 'GitSignsDeleteLn', 'GitSignsDeletePreview', 'GitSignsDeleteVirtLn', 'GitSignsDeleteInline' },
  DiffChange = { 'GitSignsChange', 'GitSignsChangeDelete', 'GitSignsChangeLn', 'GitSignsChangePreview' },
}

local function apply_theme()
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
    vim.api.nvim_set_hl(0, 'Comment', { fg = 'NvimLightGray4', italic = true })
    vim.api.nvim_set_hl(0, 'Visual', { bg = '#343B45' })
    vim.api.nvim_set_hl(0, 'StatusLine', { fg = '#A8A498', bg = '#2A2A28' })
  else
    vim.api.nvim_set_hl(0, 'IndentLine', { fg = '#E4E0D6' })
    vim.api.nvim_set_hl(0, 'IndentLineCurrent', { fg = '#CCC7B9' })
    vim.api.nvim_set_hl(0, 'TrailingWhitespace', { bg = '#F2D9CD' })
    vim.api.nvim_set_hl(0, 'String', { bg = '#F4F1E9' })
    vim.api.nvim_set_hl(0, 'Statement', { fg = '#2B2A27', bold = true })
    vim.api.nvim_set_hl(0, 'Special', { fg = '#5A7290', bold = true })
    vim.api.nvim_set_hl(0, 'Comment', { fg = '#8C887C', italic = true })
    vim.api.nvim_set_hl(0, 'Visual', { bg = '#DCE3EC' })
    vim.api.nvim_set_hl(0, 'Cursor', { bg = accent })
    vim.api.nvim_set_hl(0, 'StatusLine', { fg = '#5C5A50', bg = '#F4F1E9' })
  end

  vim.api.nvim_set_hl(0, 'Type', { bold = true })
  vim.api.nvim_set_hl(0, 'Constant', { bold = true, italic = true })
  vim.api.nvim_set_hl(0, 'FzfAccent', { fg = accent })
  vim.api.nvim_set_hl(0, 'Normal', {})
  vim.api.nvim_set_hl(0, 'NormalFloat', {})
  vim.api.nvim_set_hl(0, 'TabLine', {})

  for to, entries in pairs(highlight_links) do
    for _, from in ipairs(entries) do
      vim.api.nvim_set_hl(0, from, { link = to })
    end
  end
end

-- tmux swallows nvim's OSC 11 background query, so read macOS appearance instead
local appearance = vim.fn.system({ 'defaults', 'read', '-g', 'AppleInterfaceStyle' })
vim.o.background = appearance:match('Dark') and 'dark' or 'light'
apply_theme()

vim.api.nvim_create_autocmd("OptionSet", { pattern = "background", callback = apply_theme })
