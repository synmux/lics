# Notion Database Migration State

## Data Source ID
`0de7018e-f2dd-4f08-8dfe-04f2ca73238a`

## Database Page ID
`16cb7795-690c-80d2-b3c7-dd756e2822a0`

## Current Schema State
Round 1 Apps multi-select options set (100 options, A-Malwarebytes).
Schema replacement is NOT additive — each call replaces the entire options list.
Max 100 options per API call.

## Records to SKIP
- ALL `17fb` prefix records (Microsoft)
- `_Licence Files` (183b7795-690c-8005)
- `_Microsoft Licences` (17fb7795-690c-80db)
- `spla-number` (23fb7795-690c-81e2)

## Round 1 Completed Apps (40/100)
010 Editor, 1Password, Acrylic Wifi Pro, AI Code Prep Pro, AIR, Airfoil, Artboard, Audio Hijack, Aurora, Backup Loupe, Bartender, Bass Master, Bassynth, Blitzit, Bloom, Carbon Copy Cloner, Carbon Electra, Captain Plugins, Cryptomator, Deep, DevKnife, Digi.me, DiskTools Pro, Divvy, Dresssed, ExpanDrive, FileBot, FireTask, Fission, Flow, GPGTools, GreenBow VPN, Hazel, Hopper, Horse Browser, Launch Control, LensFlare Studio, LightPaper, Loom, Loopback

## Round 1 Remaining Apps (60)
AirServer, Alfred, Amberlight, Animate, App Tamer, App Zapper, Appfresh, Appshelf, Arq, Beamer, BeatScholar, BitTorrent Sync, CastBridge, Charles, Chipsounds, Chipspeech, ChronoSync, Clips, Code, CodeKit, Core Tunnel, CoverScout, CSSEdit, Cyberduck, Dash, Drumvolution, Drumazon, EarthDesk, Ember, Encode, FuzzMeasure, Gemini, GeoIP, Glitch2, GPG Mail, HY-Plugins, Hybrid, InstaChord, iPhoto2Tumblr, iRehearse, iStopMotion, iZotope, Jaikoz, jfriedl Lightroom Plugins, K9s, Kaleidoscope, Klimper, Klevgrand, Komodo IDE, Kubernetic, Luminar, Macaw, MacBundler, MacGourmet Deluxe, MacGPT, MacJournal, MacsyZones, MacUpdater, Magic Music Visuals, Malwarebytes

## Round 2 Apps (99)
MAMP Pro, Mariner Write, MarsEdit, MBAM, MeshCore, Mixed In Key, Modern CSV, MoneyBag, Monokai Pro, Moom, Mountain Duck, Newznab+, Nova, OmniGraffle, Omni Group, OneCast, Orb Synth, Paragon, Path Finder, Paw, PDF Signer, Photographer's Toolbox, PhpStorm, Pinegrow, PyCharm, Quadravox, QuakeNotch, Radium, Radio, RapidWeaver, Raspberry Pi Codecs, Raskin, RealVNC, Reason Lite, Remotix, Renoise, Renoise Redux, Resilio Sync, Revolution, RipIt, Rogue Amoeba, Royal Compressor, Royal TS, RubyMine, RunJS, S3 Browser, Scaler 2, Sensei, ShaperBox 2, ShoveBox, Sidespace, Slowy, Smaller, SmartSVN, Snapz Pro X, SongKong, Sonivox, SoundSource, SpectraLayers Pro, Spellbook, Spire, Squeeze, StrongSync, Sublime Merge, Sublime Text, Sugar Bytes, SwitchResX, Sylenth1, SyncMate, SynthMaster, SynthMaster One, TeraCopy, TextMate, TextSoap, The Riser, Tidy Up, Toolroom Infinite, Tower, Triaz, TuneUp, Typora, United Plugins, Updatest, Vagrant, ViDiary, Video Toolbox, Vira Theme, Viscosity, Vitamin R, Vivid, VMware Fusion, Voices, Vue Designer, WebStorm, Windownaut, WriteRoom, XTwin, Yate, Zepheer

## Key Rules for Agents
- Apps property MUST be a string "AppName", NOT array ["AppName"]
- Page IDs MUST be full 36-char UUIDs
- Agents must search first to get full UUIDs
- On 429 rate limit, wait 10s and retry
- Notion auto-creates multi-select options not in schema
