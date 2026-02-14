import {
  ASCIIFontRenderable,
  BoxRenderable,
  createCliRenderer,
  dim,
  engine,
  fg,
  RGBA,
  TextRenderable,
  Timeline,
  t
} from '@opentui/core'

// ── Color Palette (Tokyo Night) ──────────────────────────────────────
const colors = {
  bg: '#1a1a2e',
  border: '#7aa2f7',
  text: '#c0caf5',
  accent: '#bb9af7',
  muted: '#565f89'
}

// ── Coming Soon Screen ───────────────────────────────────────────────

export async function renderComingSoon(): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true })
  engine.attach(renderer)

  // Root container
  const root = new BoxRenderable(renderer, {
    id: 'root',
    width: '100%',
    height: '100%',
    backgroundColor: colors.bg,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1
  })

  // ASCII banner
  const banner = new ASCIIFontRenderable(renderer, {
    id: 'banner',
    text: 'LICS',
    font: 'tiny',
    color: RGBA.fromHex(colors.border)
  })

  // Coming Soon heading
  const heading = new TextRenderable(renderer, {
    id: 'heading',
    content: t`${fg(colors.accent)('Coming Soon')}`
  })

  // Subtitle
  const subtitle = new TextRenderable(renderer, {
    id: 'subtitle',
    content: t`${dim('Licence Key Manager')}`
  })

  // Description box
  const descBox = new BoxRenderable(renderer, {
    id: 'desc-box',
    width: 60,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    marginTop: 1,
    marginBottom: 1
  })

  const desc1 = new TextRenderable(renderer, {
    id: 'desc-1',
    content: t`${fg(colors.text)('Quickly look up and copy software licence keys')}`
  })

  const desc2 = new TextRenderable(renderer, {
    id: 'desc-2',
    content: t`${fg(colors.text)('from your Notion database, right in your terminal.')}`
  })

  descBox.add(desc1)
  descBox.add(desc2)

  // Footer
  const footer = new TextRenderable(renderer, {
    id: 'footer',
    content: t`${dim('Press any key to exit')}`
  })

  // Build the tree
  root.add(banner)
  root.add(heading)
  root.add(subtitle)
  root.add(descBox)
  root.add(footer)
  renderer.root.add(root)

  // Subtle fade-in animation for the heading
  const timeline = new Timeline({
    duration: 800,
    autoplay: true
  })

  timeline.add(
    { y: -5 },
    {
      y: 0,
      duration: 800,
      ease: 'outQuad',
      onUpdate: (anim) => {
        // Subtle vertical slide-in animation
        const offset = Math.round(anim.targets[0].y)
        heading.marginTop = offset > 0 ? offset : 0
      }
    }
  )

  engine.register(timeline)

  // Exit on any keypress
  renderer.keyInput.on('keypress', () => {
    renderer.destroy()
  })
}
