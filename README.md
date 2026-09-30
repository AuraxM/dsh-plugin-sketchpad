# dsh-plugin-sketchpad

画板 Sketchpad for the DeepSeek Harness (dsh) Web GUI: draw a quick diagram on
a whiteboard and drop it straight into the composer as a draft image — and
click any pasted draft image to preview and annotate it before sending.

## Features

- **画板入口** — a `✏️ 画板` button in the composer tool row
  (`conversation.input.left`, beside the attach chrome). Opens a modal
  whiteboard: brush (6 colors × 3 widths), eraser, undo (Ctrl+Z, 30 steps),
  clear. `插入到输入框` exports the canvas as a PNG and adds it to the
  session's draft images through the composer's own validation path, ready to
  send to the model.
- **图片预览与修改** — the plugin occupies the draft-image rail slot
  (`conversation.input.attachments`). Clicking a pasted/dropped thumbnail
  opens the same whiteboard with the image loaded (up to 1400px on the long
  edge); `插入到输入框` replaces the original draft image with the edited
  version. Hover `×` still removes an image.
- **拖拽保留** — the rail re-implements the shipped document-level
  drag/drop behavior (drop overlay + `canAcceptDrop` gating), so dropping
  image files onto the window keeps working.
- Esc or clicking the backdrop closes the editor.

The editor modal rides the frame-wide `shell.overlay` slot. Insert flows
through the rail's owner props (`onAddImages` / `onRemoveImage`), published
to a module-level store by the mounted rail entry, so the entry button never
touches the input machine directly.

Note: replacing an edited image appends the new draft and removes the old
one, so with several draft images the edited one moves to the end (the input
machine only exposes append).

## Repository layout

```
package.json      plugin manifest (dsh.bundle.patch, dsh.client, exports["./client"])
cordis.patch.yml  bundle patch: inserts the host row
lib/index.js      host half: empty shell (pure browser plugin)
lib/client.js     client half: entry button, attachment rail, whiteboard overlay
```

## Installation

This package is a **profile bundle**: `package.json` declares
`dsh.bundle.patch`, and `cordis.patch.yml` inserts the host row. One command
installs it into a profile — it links the package, registers the bundle and
enables the row — and the change applies immediately through HMR:

```
plugin_manager action=install_bundle target=E:\dsh\dsh-plugin-sketchpad
```

Do not write the profile's `package.json` or `cordis.patch.yml` by hand, and do
not Junction the package into `$DSH_HOME\profiles\node_modules`.

> **Why the old Junction method broke on Desktop 0.2.0:** a Junction-mounted
> package resolves its `@deepseek-ai/*` peers against
> `$DSH_HOME\profiles\node_modules`, which the Desktop module resolver treats as
> an **obsolete fallback** and rejects. `install_bundle` links the package under
> the profile instead, so peers resolve from the app's own install.

### Verify

- the row `include:sketchpad` reports `enabled: true, fiberPhase: "active"`
  (`plugin_manager action=list_plugins`), then
- refresh the browser once: the `✏️ 画板` button appears in the composer tool
  row, and clicking a pasted draft image opens the editor instead of the plain
  lightbox.

## License

MIT
