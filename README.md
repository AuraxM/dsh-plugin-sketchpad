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
package.json      plugin manifest (dsh.client declaration, exports["./client"])
lib/index.js      host half: empty shell (pure browser plugin)
lib/client.js     client half: entry button, attachment rail, whiteboard overlay
```

## Installation

Prerequisites: a working dsh install (the `dsh` CLI on PATH, with a web
profile).

### 1. Install the package

Junction (keeps the live link to this repository; recommended for development):

```powershell
New-Item -ItemType Junction -Path "$HOME\.dsh\profiles\node_modules\dsh-sketchpad" -Target "E:\dsh\dsh-plugin-sketchpad"
```

or copy it:

```powershell
New-Item -ItemType Directory -Force "$HOME\.dsh\profiles\node_modules"
Copy-Item -Recurse . "$HOME\.dsh\profiles\node_modules\dsh-sketchpad"
```

The bare specifier `dsh-sketchpad` then resolves from every profile.

### 2. Mount the row

The row publishes no service, so it needs no `isolate` realm. Add an `insert`
entry to the web profile's patch layer `$HOME\.dsh\profiles\web\cordis.patch.yml`:

```yaml
- insert:
    - id: sketchpad
      name: dsh-sketchpad
```

Profile boot watches this file (`watchUserPatches`), so the edit hot-reloads
into the running server — no restart needed. Every session gets the
whiteboard entry and the attachment rail.

### 3. Verify the mount, then refresh

- the served web root embeds `window.__DSH_BOOT__`; its `entries` list must
  contain id `dsh-sketchpad` (the entry id is the PACKAGE name, not the row
  id), and
- `GET /plugins/dsh-sketchpad/client.js` must return 200.

Then refresh the browser once: the `✏️ 画板` button appears in the composer
tool row, and clicking a pasted draft image opens the editor instead of the
plain lightbox.

## License

MIT
