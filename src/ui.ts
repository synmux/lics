import {
  createCliRenderer,
  ASCIIFontRenderable,
  BoxRenderable,
  TextRenderable,
  SelectRenderable,
  InputRenderable,
  InputRenderableEvents,
  SelectRenderableEvents,
  Timeline,
  engine,
  RGBA,
  t,
  bold,
  fg,
  dim,
  type CliRenderer,
  type KeyEvent,
} from "@opentui/core"
import type { License } from "./types.ts"
import { copyToClipboard } from "./clipboard.ts"
import { searchLicenses, getSuggestions } from "./store.ts"

// ── Color Palette (Tokyo Night) ──────────────────────────────────────
const colors = {
  bg: "#1a1a2e",
  border: "#7aa2f7",
  text: "#c0caf5",
  success: "#9ece6a",
  warning: "#e0af68",
  error: "#f7768e",
  info: "#7dcfff",
  muted: "#565f89",
  accent: "#bb9af7",
}

// ── Helpers ──────────────────────────────────────────────────────────

function expiryColor(license: License): string {
  if (!license.expiresAt) return colors.info
  const now = Date.now()
  const expiry = license.expiresAt.getTime()
  const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24)
  if (daysLeft < 0) return colors.error
  if (daysLeft < 30) return colors.warning
  return colors.success
}

function expiryText(license: License): string {
  if (!license.expiresAt) return "Perpetual"
  const now = Date.now()
  const expiry = license.expiresAt.getTime()
  const daysLeft = Math.floor((expiry - now) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`
  if (daysLeft === 0) return "Expires today"
  if (daysLeft < 30) return `${daysLeft}d remaining`
  const date = license.expiresAt
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`
}

function typeBadge(type: License["type"]): string {
  const labels: Record<License["type"], string> = {
    personal: "Personal",
    team: "Team",
    family: "Family",
    enterprise: "Enterprise",
  }
  return labels[type]
}

function formatLicenseOption(l: License): { name: string; description: string; value: License } {
  const exp = expiryText(l)
  return {
    name: `${l.software}`,
    description: `${typeBadge(l.type)} · ${exp}`,
    value: l,
  }
}

// ── Render: Quick Lookup ─────────────────────────────────────────────

export async function renderLookup(license: License): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true })
  engine.attach(renderer)

  // Root container
  const root = new BoxRenderable(renderer, {
    id: "root",
    width: "100%",
    height: "100%",
    backgroundColor: colors.bg,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  })

  // ASCII banner
  const banner = new ASCIIFontRenderable(renderer, {
    id: "banner",
    text: "LICS",
    font: "tiny",
    color: RGBA.fromHex(colors.border),
  })

  // Loading bar container
  const loadBarOuter = new BoxRenderable(renderer, {
    id: "load-outer",
    width: 40,
    height: 1,
    backgroundColor: colors.muted,
  })
  const loadBarInner = new BoxRenderable(renderer, {
    id: "load-inner",
    width: 0,
    height: 1,
    backgroundColor: colors.border,
  })
  loadBarOuter.add(loadBarInner)

  const loadingText = new TextRenderable(renderer, {
    id: "loading-text",
    content: t`${dim("Fetching license...")}`,
  })

  root.add(banner)
  root.add(loadingText)
  root.add(loadBarOuter)
  renderer.root.add(root)

  // Animate loading bar
  await new Promise<void>((resolve) => {
    const timeline = new Timeline({
      duration: 600,
      autoplay: true,
    })
    timeline.add(
      { w: 0 },
      {
        w: 40,
        duration: 600,
        ease: "outQuad",
        onUpdate: (anim) => {
          loadBarInner.width = Math.round(anim.targets[0].w)
        },
        onComplete: () => resolve(),
      },
    )
    engine.register(timeline)
  })

  // Transition to result card
  root.remove("loading-text")
  root.remove("load-outer")

  const card = buildLicenseCard(renderer, license)
  root.add(card)

  // Copy to clipboard
  const copied = await copyToClipboard(license.key)
  const clipboardMsg = new TextRenderable(renderer, {
    id: "clipboard-msg",
    content: copied
      ? t`${fg(colors.success)("✓ Key copied to clipboard")}`
      : t`${dim("(clipboard not available)")}`,
  })
  root.add(clipboardMsg)

  const footer = new TextRenderable(renderer, {
    id: "footer",
    content: t`${dim("Press any key to exit")}`,
  })
  root.add(footer)

  // Exit on any keypress
  renderer.keyInput.on("keypress", () => {
    renderer.destroy()
  })
}

// ── Render: Disambiguation (multiple matches) ────────────────────────

export async function renderDisambiguate(matches: License[]): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true })

  const root = new BoxRenderable(renderer, {
    id: "root",
    width: "100%",
    height: "100%",
    backgroundColor: colors.bg,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  })

  const banner = new ASCIIFontRenderable(renderer, {
    id: "banner",
    text: "LICS",
    font: "tiny",
    color: RGBA.fromHex(colors.border),
  })

  const prompt = new TextRenderable(renderer, {
    id: "prompt",
    content: t`${fg(colors.warning)("Multiple matches found.")} ${dim("Select one:")}`,
  })

  const select = new SelectRenderable(renderer, {
    id: "select",
    width: 50,
    height: Math.min(matches.length * 2 + 2, 16),
    options: matches.map(formatLicenseOption),
    selectedBackgroundColor: colors.border,
    selectedTextColor: colors.bg,
    backgroundColor: colors.bg,
    textColor: colors.text,
    descriptionColor: colors.muted,
  })

  const footer = new TextRenderable(renderer, {
    id: "footer",
    content: t`${dim("↑↓ Navigate  Enter Select  q Quit")}`,
  })

  root.add(banner)
  root.add(prompt)
  root.add(select)
  root.add(footer)
  renderer.root.add(root)
  select.focus()

  select.on(SelectRenderableEvents.ITEM_SELECTED, async (_index: number, option: { value: License }) => {
    renderer.destroy()
    await renderLookup(option.value)
  })

  renderer.keyInput.on("keypress", (key: KeyEvent) => {
    if (key.name === "q" || key.name === "escape") {
      renderer.destroy()
    }
  })
}

// ── Render: Interactive Browser ──────────────────────────────────────

export async function renderBrowser(licenses: License[]): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true })

  let searchFocused = true
  let currentLicenses = licenses

  const root = new BoxRenderable(renderer, {
    id: "root",
    width: "100%",
    height: "100%",
    backgroundColor: colors.bg,
    flexDirection: "column",
    padding: 1,
    gap: 1,
  })

  // Header with banner
  const header = new BoxRenderable(renderer, {
    id: "header",
    flexDirection: "column",
    alignItems: "center",
  })
  const banner = new ASCIIFontRenderable(renderer, {
    id: "banner",
    text: "LICS",
    font: "tiny",
    color: RGBA.fromHex(colors.border),
  })
  header.add(banner)

  // Search row
  const searchRow = new BoxRenderable(renderer, {
    id: "search-row",
    flexDirection: "row",
    gap: 1,
    alignItems: "center",
  })
  const searchLabel = new TextRenderable(renderer, {
    id: "search-label",
    content: t`${fg(colors.border)("Search:")}`,
  })
  const searchInput = new InputRenderable(renderer, {
    id: "search-input",
    width: 40,
    placeholder: "Type to filter...",
    backgroundColor: "#16161e",
    textColor: colors.text,
    cursorColor: colors.border,
    focusedBackgroundColor: "#24283b",
  })
  searchRow.add(searchLabel)
  searchRow.add(searchInput)

  // License list
  const select = new SelectRenderable(renderer, {
    id: "license-list",
    width: 55,
    height: 14,
    options: licenses.map(formatLicenseOption),
    selectedBackgroundColor: colors.border,
    selectedTextColor: colors.bg,
    backgroundColor: colors.bg,
    textColor: colors.text,
    descriptionColor: colors.muted,
    showScrollIndicator: true,
  })

  // Footer
  const footer = new TextRenderable(renderer, {
    id: "footer",
    content: t`${dim("↑↓ Navigate  Enter Select  Tab Switch focus  q Quit")}`,
  })

  root.add(header)
  root.add(searchRow)
  root.add(select)
  root.add(footer)
  renderer.root.add(root)

  // Initial focus
  searchInput.focus()

  // Search filtering
  searchInput.on(InputRenderableEvents.CHANGE, (value: string) => {
    if (value.trim() === "") {
      currentLicenses = licenses
    } else {
      currentLicenses = searchLicenses(value)
    }
    select.options = currentLicenses.map(formatLicenseOption)
    select.setSelectedIndex(0)
  })

  // Selection handling
  select.on(SelectRenderableEvents.ITEM_SELECTED, async (_index: number, option: { value: License }) => {
    renderer.destroy()
    await renderLookup(option.value)
  })

  // Global keyboard
  renderer.keyInput.on("keypress", (key: KeyEvent) => {
    if (key.name === "q" && !searchFocused) {
      renderer.destroy()
      return
    }
    if (key.name === "escape") {
      renderer.destroy()
      return
    }
    if (key.name === "tab") {
      searchFocused = !searchFocused
      if (searchFocused) {
        select.blur()
        searchInput.focus()
      } else {
        searchInput.blur()
        select.focus()
      }
    }
  })
}

// ── Render: List (non-interactive) ───────────────────────────────────

export async function renderList(licenses: License[]): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true })

  const root = new BoxRenderable(renderer, {
    id: "root",
    width: "100%",
    height: "100%",
    backgroundColor: colors.bg,
    flexDirection: "column",
    padding: 1,
    gap: 0,
  })

  // Banner
  const banner = new ASCIIFontRenderable(renderer, {
    id: "banner",
    text: "LICS",
    font: "tiny",
    color: RGBA.fromHex(colors.border),
  })

  // Header row
  const headerRow = new BoxRenderable(renderer, {
    id: "header-row",
    flexDirection: "row",
    gap: 1,
    paddingLeft: 1,
    paddingRight: 1,
  })
  headerRow.add(
    new TextRenderable(renderer, {
      id: "h-name",
      content: t`${bold(fg(colors.border)("Software"))}`,
      width: 28,
    }),
  )
  headerRow.add(
    new TextRenderable(renderer, {
      id: "h-type",
      content: t`${bold(fg(colors.border)("Type"))}`,
      width: 12,
    }),
  )
  headerRow.add(
    new TextRenderable(renderer, {
      id: "h-exp",
      content: t`${bold(fg(colors.border)("Expiry"))}`,
      width: 16,
    }),
  )

  // Separator
  const sep = new TextRenderable(renderer, {
    id: "separator",
    content: t`${fg(colors.muted)("─".repeat(58))}`,
  })

  root.add(banner)
  root.add(headerRow)
  root.add(sep)

  // Data rows
  for (const license of licenses) {
    const row = new BoxRenderable(renderer, {
      id: `row-${license.id}`,
      flexDirection: "row",
      gap: 1,
      paddingLeft: 1,
      paddingRight: 1,
    })
    row.add(
      new TextRenderable(renderer, {
        id: `name-${license.id}`,
        content: t`${fg(colors.text)(license.software)}`,
        width: 28,
      }),
    )
    row.add(
      new TextRenderable(renderer, {
        id: `type-${license.id}`,
        content: t`${fg(colors.accent)(typeBadge(license.type))}`,
        width: 12,
      }),
    )
    row.add(
      new TextRenderable(renderer, {
        id: `exp-${license.id}`,
        content: t`${fg(expiryColor(license))(expiryText(license))}`,
        width: 16,
      }),
    )
    root.add(row)
  }

  // Footer
  const footer = new TextRenderable(renderer, {
    id: "footer",
    content: t`\n${dim("Press any key to exit")}`,
    marginTop: 1,
  })
  root.add(footer)

  renderer.root.add(root)

  renderer.keyInput.on("keypress", () => {
    renderer.destroy()
  })
}

// ── Render: Error ────────────────────────────────────────────────────

export async function renderError(message: string, query?: string): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true })

  const root = new BoxRenderable(renderer, {
    id: "root",
    width: "100%",
    height: "100%",
    backgroundColor: colors.bg,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  })

  const banner = new ASCIIFontRenderable(renderer, {
    id: "banner",
    text: "LICS",
    font: "tiny",
    color: RGBA.fromHex(colors.border),
  })

  const errorBox = new BoxRenderable(renderer, {
    id: "error-box",
    border: true,
    borderStyle: "rounded",
    borderColor: colors.error,
    padding: 1,
    flexDirection: "column",
    gap: 1,
    width: 50,
  })

  const errorMsg = new TextRenderable(renderer, {
    id: "error-msg",
    content: t`${fg(colors.error)("✗")} ${bold(message)}`,
  })
  errorBox.add(errorMsg)

  // Show suggestions if we have a query
  if (query) {
    const suggestions = getSuggestions(query)
    if (suggestions.length > 0) {
      const sugLabel = new TextRenderable(renderer, {
        id: "sug-label",
        content: t`${dim("Did you mean:")}`,
      })
      errorBox.add(sugLabel)
      for (let i = 0; i < suggestions.length; i++) {
        const sug = new TextRenderable(renderer, {
          id: `sug-${i}`,
          content: t`  ${fg(colors.info)("•")} ${suggestions[i]!}`,
        })
        errorBox.add(sug)
      }
    }
  }

  const footer = new TextRenderable(renderer, {
    id: "footer",
    content: t`${dim("Press any key to exit")}`,
  })

  root.add(banner)
  root.add(errorBox)
  root.add(footer)
  renderer.root.add(root)

  renderer.keyInput.on("keypress", () => {
    renderer.destroy()
  })
}

// ── Private: License card component ──────────────────────────────────

function buildLicenseCard(renderer: CliRenderer, license: License): BoxRenderable {
  const card = new BoxRenderable(renderer, {
    id: "card",
    border: true,
    borderStyle: "rounded",
    borderColor: colors.border,
    padding: 1,
    flexDirection: "column",
    gap: 1,
    width: 50,
    backgroundColor: "#16161e",
  })

  // Software name
  const nameText = new TextRenderable(renderer, {
    id: "card-name",
    content: t`${bold(fg(colors.text)(license.software))}`,
  })

  // Key
  const keyText = new TextRenderable(renderer, {
    id: "card-key",
    content: t`${fg(colors.info)(license.key)}`,
  })

  // Type + expiry row
  const metaRow = new BoxRenderable(renderer, {
    id: "card-meta",
    flexDirection: "row",
    gap: 2,
  })
  metaRow.add(
    new TextRenderable(renderer, {
      id: "card-type",
      content: t`${fg(colors.accent)(typeBadge(license.type))}`,
    }),
  )
  metaRow.add(
    new TextRenderable(renderer, {
      id: "card-expiry",
      content: t`${fg(expiryColor(license))(expiryText(license))}`,
    }),
  )

  card.add(nameText)
  card.add(keyText)
  card.add(metaRow)

  // Notes if present
  if (license.notes) {
    const notes = new TextRenderable(renderer, {
      id: "card-notes",
      content: t`${dim(license.notes)}`,
    })
    card.add(notes)
  }

  return card
}
