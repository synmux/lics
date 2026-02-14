import {
	ASCIIFontRenderable,
	BoxRenderable,
	bold,
	type CliRenderer,
	createCliRenderer,
	dim,
	engine,
	fg,
	InputRenderable,
	InputRenderableEvents,
	type KeyEvent,
	RGBA,
	SelectRenderable,
	SelectRenderableEvents,
	TextRenderable,
	Timeline,
	t,
} from "@opentui/core";
import { copyToClipboard, writeLicenceFile } from "./clipboard.ts";
import { getSuggestions, searchLicences } from "./store.ts";
import type { Licence } from "./types.ts";
import { licenceKind } from "./types.ts";

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
};

// ── Helpers ──────────────────────────────────────────────────────────

function expiryColor(licence: Licence): string {
	if (!licence.expiryDate) return colors.info;
	const now = Date.now();
	const expiry = licence.expiryDate.getTime();
	const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24);
	if (daysLeft < 0) return colors.error;
	if (daysLeft < 30) return colors.warning;
	return colors.success;
}

function expiryText(licence: Licence): string {
	if (!licence.expiryDate) return "Perpetual";
	const now = Date.now();
	const expiry = licence.expiryDate.getTime();
	const daysLeft = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
	if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
	if (daysLeft === 0) return "Expires today";
	if (daysLeft < 30) return `${daysLeft}d remaining`;
	const date = licence.expiryDate;
	return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function kindBadge(licence: Licence): string {
	const kind = licenceKind(licence);
	switch (kind) {
		case "key":
			return "Key";
		case "file":
			return "File";
		case "both":
			return "Key+File";
		case "none":
			return "—";
	}
}

function formatLicenceOption(l: Licence): {
	name: string;
	description: string;
	value: Licence;
} {
	const exp = expiryText(l);
	const badge = kindBadge(l);
	return {
		name: l.app,
		description: `${badge} · ${exp}`,
		value: l,
	};
}

// ── Render: Quick Lookup ─────────────────────────────────────────────

export async function renderLookup(
	licence: Licence,
	outputDir?: string,
): Promise<void> {
	const renderer = await createCliRenderer({ exitOnCtrlC: true });
	engine.attach(renderer);

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
	});

	// ASCII banner
	const banner = new ASCIIFontRenderable(renderer, {
		id: "banner",
		text: "LICS",
		font: "tiny",
		color: RGBA.fromHex(colors.border),
	});

	// Loading bar container
	const loadBarOuter = new BoxRenderable(renderer, {
		id: "load-outer",
		width: 40,
		height: 1,
		backgroundColor: colors.muted,
	});
	const loadBarInner = new BoxRenderable(renderer, {
		id: "load-inner",
		width: 0,
		height: 1,
		backgroundColor: colors.border,
	});
	loadBarOuter.add(loadBarInner);

	const loadingText = new TextRenderable(renderer, {
		id: "loading-text",
		content: t`${dim("Fetching licence...")}`,
	});

	root.add(banner);
	root.add(loadingText);
	root.add(loadBarOuter);
	renderer.root.add(root);

	// Animate loading bar
	await new Promise<void>((resolve) => {
		const timeline = new Timeline({
			duration: 600,
			autoplay: true,
		});
		timeline.add(
			{ w: 0 },
			{
				w: 40,
				duration: 600,
				ease: "outQuad",
				onUpdate: (anim) => {
					loadBarInner.width = Math.round(anim.targets[0].w);
				},
				onComplete: () => resolve(),
			},
		);
		engine.register(timeline);
	});

	// Transition to result card
	root.remove("loading-text");
	root.remove("load-outer");

	const card = buildLicenceCard(renderer, licence);
	root.add(card);

	// Handle key copy / file write based on licence kind
	const kind = licenceKind(licence);
	let actionMsg = "";

	if (kind === "key" || kind === "both") {
		const copied = await copyToClipboard(licence.licenceKey!);
		actionMsg = copied
			? `✓ Key copied to clipboard`
			: `(clipboard not available)`;
	}

	if (kind === "file" || kind === "both") {
		const path = await writeLicenceFile(licence.licenceFile!, outputDir);
		const fileMsg = path
			? `✓ Licence file saved to ${path}`
			: `✗ Failed to write licence file`;
		actionMsg = actionMsg ? `${actionMsg}\n${fileMsg}` : fileMsg;
	}

	if (kind === "none") {
		actionMsg = "(no key or file available)";
	}

	// Show action result
	const lines = actionMsg.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const isSuccess = line.startsWith("✓");
		const isError = line.startsWith("✗");
		const color = isSuccess
			? colors.success
			: isError
				? colors.error
				: colors.muted;
		root.add(
			new TextRenderable(renderer, {
				id: `action-msg-${i}`,
				content: t`${fg(color)(line)}`,
			}),
		);
	}

	const footer = new TextRenderable(renderer, {
		id: "footer",
		content: t`${dim("Press any key to exit")}`,
	});
	root.add(footer);

	// Exit on any keypress
	renderer.keyInput.on("keypress", () => {
		renderer.destroy();
	});
}

// ── Render: Disambiguation (multiple matches) ────────────────────────

export async function renderDisambiguate(
	matches: Licence[],
	outputDir?: string,
): Promise<void> {
	const renderer = await createCliRenderer({ exitOnCtrlC: true });

	const root = new BoxRenderable(renderer, {
		id: "root",
		width: "100%",
		height: "100%",
		backgroundColor: colors.bg,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		gap: 1,
	});

	const banner = new ASCIIFontRenderable(renderer, {
		id: "banner",
		text: "LICS",
		font: "tiny",
		color: RGBA.fromHex(colors.border),
	});

	const prompt = new TextRenderable(renderer, {
		id: "prompt",
		content: t`${fg(colors.warning)("Multiple matches found.")} ${dim("Select one:")}`,
	});

	const select = new SelectRenderable(renderer, {
		id: "select",
		width: 50,
		height: Math.min(matches.length * 2 + 2, 16),
		options: matches.map(formatLicenceOption),
		selectedBackgroundColor: colors.border,
		selectedTextColor: colors.bg,
		backgroundColor: colors.bg,
		textColor: colors.text,
		descriptionColor: colors.muted,
	});

	const footer = new TextRenderable(renderer, {
		id: "footer",
		content: t`${dim("↑↓ Navigate  Enter Select  q Quit")}`,
	});

	root.add(banner);
	root.add(prompt);
	root.add(select);
	root.add(footer);
	renderer.root.add(root);
	select.focus();

	select.on(
		SelectRenderableEvents.ITEM_SELECTED,
		async (_index: number, option: { value: Licence }) => {
			renderer.destroy();
			await renderLookup(option.value, outputDir);
		},
	);

	renderer.keyInput.on("keypress", (key: KeyEvent) => {
		if (key.name === "q" || key.name === "escape") {
			renderer.destroy();
		}
	});
}

// ── Render: Interactive Browser ──────────────────────────────────────

export async function renderBrowser(
	licences: Licence[],
	outputDir?: string,
): Promise<void> {
	const renderer = await createCliRenderer({ exitOnCtrlC: true });

	let searchFocused = true;
	let currentLicences = licences;

	const root = new BoxRenderable(renderer, {
		id: "root",
		width: "100%",
		height: "100%",
		backgroundColor: colors.bg,
		flexDirection: "column",
		padding: 1,
		gap: 1,
	});

	// Header with banner
	const header = new BoxRenderable(renderer, {
		id: "header",
		flexDirection: "column",
		alignItems: "center",
	});
	const banner = new ASCIIFontRenderable(renderer, {
		id: "banner",
		text: "LICS",
		font: "tiny",
		color: RGBA.fromHex(colors.border),
	});
	header.add(banner);

	// Search row
	const searchRow = new BoxRenderable(renderer, {
		id: "search-row",
		flexDirection: "row",
		gap: 1,
		alignItems: "center",
	});
	const searchLabel = new TextRenderable(renderer, {
		id: "search-label",
		content: t`${fg(colors.border)("Search:")}`,
	});
	const searchInput = new InputRenderable(renderer, {
		id: "search-input",
		width: 40,
		placeholder: "Type to filter...",
		backgroundColor: "#16161e",
		textColor: colors.text,
		cursorColor: colors.border,
		focusedBackgroundColor: "#24283b",
	});
	searchRow.add(searchLabel);
	searchRow.add(searchInput);

	// Licence list
	const select = new SelectRenderable(renderer, {
		id: "licence-list",
		width: 55,
		height: 14,
		options: licences.map(formatLicenceOption),
		selectedBackgroundColor: colors.border,
		selectedTextColor: colors.bg,
		backgroundColor: colors.bg,
		textColor: colors.text,
		descriptionColor: colors.muted,
		showScrollIndicator: true,
	});

	// Footer
	const footer = new TextRenderable(renderer, {
		id: "footer",
		content: t`${dim("↑↓ Navigate  Enter Select  Tab Switch focus  q Quit")}`,
	});

	root.add(header);
	root.add(searchRow);
	root.add(select);
	root.add(footer);
	renderer.root.add(root);

	// Initial focus
	searchInput.focus();

	// Search filtering
	searchInput.on(InputRenderableEvents.CHANGE, (value: string) => {
		if (value.trim() === "") {
			currentLicences = licences;
		} else {
			currentLicences = searchLicences(value);
		}
		select.options = currentLicences.map(formatLicenceOption);
		select.setSelectedIndex(0);
	});

	// Selection handling
	select.on(
		SelectRenderableEvents.ITEM_SELECTED,
		async (_index: number, option: { value: Licence }) => {
			renderer.destroy();
			await renderLookup(option.value, outputDir);
		},
	);

	// Global keyboard
	renderer.keyInput.on("keypress", (key: KeyEvent) => {
		if (key.name === "q" && !searchFocused) {
			renderer.destroy();
			return;
		}
		if (key.name === "escape") {
			renderer.destroy();
			return;
		}
		if (key.name === "tab") {
			searchFocused = !searchFocused;
			if (searchFocused) {
				select.blur();
				searchInput.focus();
			} else {
				searchInput.blur();
				select.focus();
			}
		}
	});
}

// ── Render: List (non-interactive) ───────────────────────────────────

export async function renderList(licences: Licence[]): Promise<void> {
	const renderer = await createCliRenderer({ exitOnCtrlC: true });

	const root = new BoxRenderable(renderer, {
		id: "root",
		width: "100%",
		height: "100%",
		backgroundColor: colors.bg,
		flexDirection: "column",
		padding: 1,
		gap: 0,
	});

	// Banner
	const banner = new ASCIIFontRenderable(renderer, {
		id: "banner",
		text: "LICS",
		font: "tiny",
		color: RGBA.fromHex(colors.border),
	});

	// Header row
	const headerRow = new BoxRenderable(renderer, {
		id: "header-row",
		flexDirection: "row",
		gap: 1,
		paddingLeft: 1,
		paddingRight: 1,
	});
	headerRow.add(
		new TextRenderable(renderer, {
			id: "h-name",
			content: t`${bold(fg(colors.border)("Software"))}`,
			width: 28,
		}),
	);
	headerRow.add(
		new TextRenderable(renderer, {
			id: "h-kind",
			content: t`${bold(fg(colors.border)("Kind"))}`,
			width: 10,
		}),
	);
	headerRow.add(
		new TextRenderable(renderer, {
			id: "h-exp",
			content: t`${bold(fg(colors.border)("Expiry"))}`,
			width: 16,
		}),
	);

	// Separator
	const sep = new TextRenderable(renderer, {
		id: "separator",
		content: t`${fg(colors.muted)("─".repeat(58))}`,
	});

	root.add(banner);
	root.add(headerRow);
	root.add(sep);

	// Data rows
	for (const licence of licences) {
		const row = new BoxRenderable(renderer, {
			id: `row-${licence.id}`,
			flexDirection: "row",
			gap: 1,
			paddingLeft: 1,
			paddingRight: 1,
		});
		row.add(
			new TextRenderable(renderer, {
				id: `name-${licence.id}`,
				content: t`${fg(colors.text)(licence.app)}`,
				width: 28,
			}),
		);
		row.add(
			new TextRenderable(renderer, {
				id: `kind-${licence.id}`,
				content: t`${fg(colors.accent)(kindBadge(licence))}`,
				width: 10,
			}),
		);
		row.add(
			new TextRenderable(renderer, {
				id: `exp-${licence.id}`,
				content: t`${fg(expiryColor(licence))(expiryText(licence))}`,
				width: 16,
			}),
		);
		root.add(row);
	}

	// Footer
	const footer = new TextRenderable(renderer, {
		id: "footer",
		content: t`\n${dim("Press any key to exit")}`,
		marginTop: 1,
	});
	root.add(footer);

	renderer.root.add(root);

	renderer.keyInput.on("keypress", () => {
		renderer.destroy();
	});
}

// ── Render: Error ────────────────────────────────────────────────────

export async function renderError(
	message: string,
	query?: string,
): Promise<void> {
	const renderer = await createCliRenderer({ exitOnCtrlC: true });

	const root = new BoxRenderable(renderer, {
		id: "root",
		width: "100%",
		height: "100%",
		backgroundColor: colors.bg,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		gap: 1,
	});

	const banner = new ASCIIFontRenderable(renderer, {
		id: "banner",
		text: "LICS",
		font: "tiny",
		color: RGBA.fromHex(colors.border),
	});

	const errorBox = new BoxRenderable(renderer, {
		id: "error-box",
		border: true,
		borderStyle: "rounded",
		borderColor: colors.error,
		padding: 1,
		flexDirection: "column",
		gap: 1,
		width: 50,
	});

	const errorMsg = new TextRenderable(renderer, {
		id: "error-msg",
		content: t`${fg(colors.error)("✗")} ${bold(message)}`,
	});
	errorBox.add(errorMsg);

	// Show suggestions if we have a query
	if (query) {
		const suggestions = getSuggestions(query);
		if (suggestions.length > 0) {
			const sugLabel = new TextRenderable(renderer, {
				id: "sug-label",
				content: t`${dim("Did you mean:")}`,
			});
			errorBox.add(sugLabel);
			for (let i = 0; i < suggestions.length; i++) {
				const sug = new TextRenderable(renderer, {
					id: `sug-${i}`,
					content: t`  ${fg(colors.info)("•")} ${suggestions[i]!}`,
				});
				errorBox.add(sug);
			}
		}
	}

	const footer = new TextRenderable(renderer, {
		id: "footer",
		content: t`${dim("Press any key to exit")}`,
	});

	root.add(banner);
	root.add(errorBox);
	root.add(footer);
	renderer.root.add(root);

	renderer.keyInput.on("keypress", () => {
		renderer.destroy();
	});
}

// ── Private: Licence card component ──────────────────────────────────

function buildLicenceCard(
	renderer: CliRenderer,
	licence: Licence,
): BoxRenderable {
	const card = new BoxRenderable(renderer, {
		id: "card",
		border: true,
		borderStyle: "rounded",
		borderColor: colors.border,
		padding: 1,
		flexDirection: "column",
		gap: 1,
		width: 55,
		backgroundColor: "#16161e",
	});

	// App name
	const nameText = new TextRenderable(renderer, {
		id: "card-name",
		content: t`${bold(fg(colors.text)(licence.app))}`,
	});
	card.add(nameText);

	// Licence key or file indicator
	const kind = licenceKind(licence);

	if (licence.licenceKey) {
		const keyText = new TextRenderable(renderer, {
			id: "card-key",
			content: t`${fg(colors.info)(licence.licenceKey)}`,
		});
		card.add(keyText);
	}

	if (licence.licenceFile) {
		const fileText = new TextRenderable(renderer, {
			id: "card-file",
			content: t`${fg(colors.accent)("📄 " + licence.licenceFile.name)}`,
		});
		card.add(fileText);
	}

	if (kind === "none") {
		const noneText = new TextRenderable(renderer, {
			id: "card-none",
			content: t`${dim("(no key or file)")}`,
		});
		card.add(noneText);
	}

	// Metadata row: kind badge + expiry
	const metaRow = new BoxRenderable(renderer, {
		id: "card-meta",
		flexDirection: "row",
		gap: 2,
	});
	metaRow.add(
		new TextRenderable(renderer, {
			id: "card-kind",
			content: t`${fg(colors.accent)(kindBadge(licence))}`,
		}),
	);
	metaRow.add(
		new TextRenderable(renderer, {
			id: "card-expiry",
			content: t`${fg(expiryColor(licence))(expiryText(licence))}`,
		}),
	);
	card.add(metaRow);

	// Version if present
	if (licence.version) {
		const versionText = new TextRenderable(renderer, {
			id: "card-version",
			content: t`${dim("Version:")} ${licence.version}`,
		});
		card.add(versionText);
	}

	// Registered to (name + email)
	if (licence.name || licence.email) {
		const parts = [licence.name, licence.email].filter(Boolean).join(" · ");
		const regText = new TextRenderable(renderer, {
			id: "card-reg",
			content: t`${dim("Registered:")} ${parts}`,
		});
		card.add(regText);
	}

	// URL if present
	if (licence.url) {
		const urlText = new TextRenderable(renderer, {
			id: "card-url",
			content: t`${dim("URL:")} ${fg(colors.border)(licence.url)}`,
		});
		card.add(urlText);
	}

	// Note if present
	if (licence.note) {
		const noteText = new TextRenderable(renderer, {
			id: "card-note",
			content: t`${dim(licence.note)}`,
		});
		card.add(noteText);
	}

	return card;
}
