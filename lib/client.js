/**
 * dsh-sketchpad - Client half (browser).
 *
 * A whiteboard for the composer:
 *
 * - Entry: a "画板" button in the `conversation.input.left` slot (the composer
 *   tool row, beside the attach chrome). Opens a modal whiteboard with a brush
 *   (6 colors x 3 widths), eraser, undo (Ctrl+Z, 30 steps) and clear; the
 *   finished drawing is exported as a PNG File and inserted into the session's
 *   draft images through the composer's own validation path.
 * - Edit: this package also occupies the `conversation.input.attachments`
 *   slot (draft-image rail). Clicking a pasted/dropped draft image opens the
 *   same whiteboard with the image loaded; "insert" then replaces the
 *   original draft image (append new + remove old). The rail re-implements
 *   the shipped document-level drag/drop behavior so dropping files keeps
 *   working.
 *
 * The editor modal rides the frame-wide `shell.overlay` slot. Insert flows
 * through the rail's owner props (onAddImages/onRemoveImage), published to a
 * module-level store by the mounted rail entry, so the entry button never
 * touches the input machine directly.
 */
window.__ModuleLoader__.load({
  id: "dsh-sketchpad",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var React = require("react");

    var CSS =
      ".wb-entry{display:inline-flex;align-items:center;gap:4px;border:0;background:transparent;color:inherit;cursor:pointer;font-size:13px;line-height:1;padding:6px 8px;border-radius:8px;opacity:.75}" +
      ".wb-entry:hover{opacity:1;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}" +
      ".wb-rail{display:flex;flex-wrap:wrap;gap:10px;padding:4px 12px 0;min-width:0}" +
      ".wb-thumb{position:relative;width:64px;height:64px;flex:none;border-radius:14px;overflow:hidden;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,rgba(127,127,127,.35));background:#fff;cursor:zoom-in;padding:0}" +
      ".wb-thumb img{width:100%;height:100%;object-fit:cover;display:block}" +
      ".wb-thumb .wb-edit{position:absolute;left:0;right:0;bottom:0;padding:2px 0;font-size:10px;line-height:14px;text-align:center;background:rgba(0,0,0,.55);color:#fff;opacity:0;transition:opacity .15s;pointer-events:none}" +
      ".wb-thumb:hover .wb-edit{opacity:1}" +
      ".wb-remove{position:absolute;top:2px;right:2px;width:18px;height:18px;border:0;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:11px;line-height:18px;text-align:center;cursor:pointer;padding:0;opacity:0;transition:opacity .15s}" +
      ".wb-thumb:hover .wb-remove{opacity:1}" +
      ".wb-drop{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;background:rgba(20,20,24,.55);pointer-events:none}" +
      ".wb-drop>div{padding:18px 28px;border:2px dashed rgba(255,255,255,.6);border-radius:16px;color:#fff;font-size:15px;background:rgba(0,0,0,.35)}" +
      ".wb-overlay{position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;background:rgba(12,12,16,.62);pointer-events:auto}" +
      ".wb-panel{display:flex;flex-direction:column;gap:10px;max-width:min(96vw,1080px);max-height:92vh;padding:14px;border-radius:16px;background:var(--dsw-alias-bg-primary,#1f1f23);color:inherit;box-shadow:0 18px 60px rgba(0,0,0,.45);outline:none}" +
      ".wb-title{font-size:14px;font-weight:600;opacity:.9}" +
      ".wb-canvas-wrap{display:flex;align-items:center;justify-content:center;overflow:auto;min-height:0}" +
      ".wb-canvas{background:#fff;border-radius:10px;touch-action:none;cursor:crosshair;max-width:100%;max-height:66vh}" +
      ".wb-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px}" +
      ".wb-swatches{display:flex;gap:6px;align-items:center}" +
      ".wb-swatch{width:22px;height:22px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}" +
      ".wb-swatch[data-active=true]{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.25)}" +
      ".wb-btn{border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;font-size:12px;padding:5px 10px;border-radius:8px;cursor:pointer}" +
      ".wb-btn:hover{background:rgba(127,127,127,.15)}" +
      ".wb-btn[data-active=true]{background:rgba(80,140,255,.25);border-color:rgba(80,140,255,.7)}" +
      ".wb-btn:disabled{opacity:.4;cursor:default}" +
      ".wb-btn-primary{border:0;background:#4c7dff;color:#fff;font-size:13px;padding:7px 16px;border-radius:9px;cursor:pointer}" +
      ".wb-btn-primary:hover{background:#5d89ff}" +
      ".wb-spacer{flex:1}" +
      ".wb-hint{font-size:11px;opacity:.55}";

    var tagId = "dsh-sketchpad/sketchpad.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-sketchpad";
      tag.dataset.pluginCss = tagId;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    var COLORS = ["#1a1a1a", "#e03131", "#1971c2", "#2f9e44", "#f08c00", "#862e9c"];
    var SIZES = [3, 6, 12];
    var BLANK_W = 960;
    var BLANK_H = 600;
    var MAX_EDGE = 1400;

    function apply(ctx) {
      // ---- shared in-memory store (plugin lifetime only) ----
      var listeners = new Set();
      var store = {
        editor: null, // null | { mode: 'blank' } | { mode: 'edit', attachment: { id, previewUrl, name } }
        rail: null,   // { onAddImages, onRemoveImage } published by the rail entry
        open: function (editor) { store.editor = editor; emit(); },
        close: function () { store.editor = null; emit(); },
        setRail: function (rail) { store.rail = rail; },
        subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; },
      };
      function emit() { listeners.forEach(function (fn) { fn(); }); }
      function useEditor() {
        var pair = React.useState(store.editor);
        var ed = pair[0];
        var setEd = pair[1];
        React.useEffect(function () {
          return store.subscribe(function () { setEd(store.editor); });
        }, []);
        return ed;
      }

      // ---- composer left entry: whiteboard button ----
      function LeftEntry() {
        return React.createElement("button", {
          className: "wb-entry",
          type: "button",
          title: "画板：绘制示意图并插入到输入框",
          onClick: function () { store.open({ mode: "blank" }); },
        }, "✏️ 画板");
      }

      // ---- attachments rail: click thumbnail to preview/edit ----
      function Rail(props) {
        var attachments = props.attachments || [];
        var canAcceptDrop = !!props.canAcceptDrop;
        var onAddImages = props.onAddImages;
        var onRemoveImage = props.onRemoveImage;
        var dragState = React.useState(false);
        var dragActive = dragState[0];
        var setDragActive = dragState[1];
        var rootRef = React.useRef(null);
        var depthRef = React.useRef(0);

        React.useEffect(function () {
          store.setRail({ onAddImages: onAddImages, onRemoveImage: onRemoveImage });
        }, [onAddImages, onRemoveImage]);

        React.useEffect(function () {
          var root = rootRef.current;
          var doc = root && root.ownerDocument;
          if (!doc) return undefined;
          var win = doc.defaultView;
          var pick = function (event) {
            var dt = event.dataTransfer;
            if (!dt || !dt.types || !Array.prototype.includes.call(dt.types, "Files")) return null;
            return dt;
          };
          var reset = function () { depthRef.current = 0; setDragActive(false); };
          var onDragEnter = function (event) {
            if (pick(event) === null) return;
            event.preventDefault();
            depthRef.current += 1;
            setDragActive(true);
          };
          var onDragOver = function (event) {
            var dt = pick(event);
            if (dt === null) return;
            event.preventDefault();
            dt.dropEffect = canAcceptDrop ? "copy" : "none";
          };
          var onDragLeave = function (event) {
            if (pick(event) === null) return;
            depthRef.current = Math.max(0, depthRef.current - 1);
            if (depthRef.current === 0) setDragActive(false);
            var left = event.clientX <= 0 || event.clientY <= 0 || (win && event.clientX >= win.innerWidth) || (win && event.clientY >= win.innerHeight);
            if ((event.target === doc.documentElement || event.target === doc.body) && left) reset();
          };
          var onDrop = function (event) {
            var dt = pick(event);
            if (dt === null) return;
            event.preventDefault();
            reset();
            if (canAcceptDrop && onAddImages) onAddImages(Array.prototype.slice.call(dt.files));
          };
          doc.addEventListener("dragenter", onDragEnter);
          doc.addEventListener("dragover", onDragOver);
          doc.addEventListener("dragleave", onDragLeave);
          doc.addEventListener("drop", onDrop);
          if (win) win.addEventListener("dragend", reset);
          return function () {
            doc.removeEventListener("dragenter", onDragEnter);
            doc.removeEventListener("dragover", onDragOver);
            doc.removeEventListener("dragleave", onDragLeave);
            doc.removeEventListener("drop", onDrop);
            if (win) win.removeEventListener("dragend", reset);
          };
        }, [canAcceptDrop, onAddImages]);

        var children = [];
        if (attachments.length > 0) {
          children.push(React.createElement("div", { className: "wb-rail", key: "rail" },
            attachments.map(function (att) {
              return React.createElement("div", { className: "wb-thumb", key: att.id },
                React.createElement("img", {
                  src: att.previewUrl,
                  alt: (att.file && att.file.name) || "图片",
                  onClick: function () {
                    store.open({ mode: "edit", attachment: { id: att.id, previewUrl: att.previewUrl, name: (att.file && att.file.name) || "image.png" } });
                  },
                }),
                React.createElement("span", { className: "wb-edit" }, "点击编辑"),
                React.createElement("button", {
                  className: "wb-remove",
                  type: "button",
                  title: "移除图片",
                  onClick: function (e) { e.stopPropagation(); if (onRemoveImage) onRemoveImage(att.id); },
                }, "×")
              );
            })
          ));
        }
        if (dragActive) {
          children.push(React.createElement("div", { className: "wb-drop", key: "drop" },
            React.createElement("div", null, canAcceptDrop ? "松开以添加图片" : "当前无法添加图片")
          ));
        }
        return React.createElement("div", { ref: rootRef }, children);
      }

      // ---- whiteboard editor (shell overlay) ----
      function Editor(props) {
        var editor = props.editor;
        var canvasRef = React.useRef(null);
        var panelRef = React.useRef(null);
        var drawingRef = React.useRef(false);
        var lastRef = React.useRef(null);
        var undoRef = React.useRef([]);
        var colorState = React.useState(COLORS[0]);
        var color = colorState[0];
        var setColor = colorState[1];
        var sizeState = React.useState(SIZES[1]);
        var size = sizeState[0];
        var setSize = sizeState[1];
        var eraseState = React.useState(false);
        var erasing = eraseState[0];
        var setErasing = eraseState[1];
        var undoState = React.useState(0);
        var undoCount = undoState[0];
        var setUndoCount = undoState[1];

        // init canvas content
        React.useEffect(function () {
          var canvas = canvasRef.current;
          if (!canvas) return;
          var c2d = canvas.getContext("2d");
          var fillWhite = function () { c2d.fillStyle = "#ffffff"; c2d.fillRect(0, 0, canvas.width, canvas.height); };
          if (editor.mode === "edit" && editor.attachment) {
            var img = new Image();
            img.onload = function () {
              var scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
              canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
              canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
              fillWhite();
              c2d.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = editor.attachment.previewUrl;
          } else {
            canvas.width = BLANK_W;
            canvas.height = BLANK_H;
            fillWhite();
          }
          undoRef.current = [];
          setUndoCount(0);
          if (panelRef.current) panelRef.current.focus();
        }, [editor]);

        var pushUndo = function () {
          var canvas = canvasRef.current;
          if (!canvas) return;
          try {
            undoRef.current.push(canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height));
            if (undoRef.current.length > 30) undoRef.current.shift();
            setUndoCount(undoRef.current.length);
          } catch (err) { /* canvas tainted or OOM: undo unavailable */ }
        };
        var undo = function () {
          var canvas = canvasRef.current;
          var prev = undoRef.current.pop();
          if (!canvas || !prev) return;
          canvas.getContext("2d").putImageData(prev, 0, 0);
          setUndoCount(undoRef.current.length);
        };
        var clearAll = function () {
          var canvas = canvasRef.current;
          if (!canvas) return;
          pushUndo();
          var c2d = canvas.getContext("2d");
          c2d.fillStyle = "#ffffff";
          c2d.fillRect(0, 0, canvas.width, canvas.height);
        };

        var point = function (e) {
          var canvas = canvasRef.current;
          var rect = canvas.getBoundingClientRect();
          return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
          };
        };
        var strokeTo = function (from, to) {
          var canvas = canvasRef.current;
          var c2d = canvas.getContext("2d");
          c2d.strokeStyle = erasing ? "#ffffff" : color;
          c2d.lineWidth = erasing ? size * 3 : size;
          c2d.lineCap = "round";
          c2d.lineJoin = "round";
          c2d.beginPath();
          c2d.moveTo(from.x, from.y);
          c2d.lineTo(to.x, to.y);
          c2d.stroke();
        };
        var onPointerDown = function (e) {
          if (e.button !== 0 && e.pointerType === "mouse") return;
          e.preventDefault();
          pushUndo();
          drawingRef.current = true;
          var p = point(e);
          lastRef.current = p;
          strokeTo(p, p);
          e.currentTarget.setPointerCapture(e.pointerId);
        };
        var onPointerMove = function (e) {
          if (!drawingRef.current) return;
          var p = point(e);
          strokeTo(lastRef.current, p);
          lastRef.current = p;
        };
        var endStroke = function () { drawingRef.current = false; lastRef.current = null; };

        var insert = function () {
          var canvas = canvasRef.current;
          var rail = store.rail;
          if (!canvas || !rail || !rail.onAddImages) return;
          canvas.toBlob(function (blob) {
            if (!blob) return;
            var name = editor.mode === "edit" && editor.attachment ? editor.attachment.name : "sketch.png";
            var file = new File([blob], name, { type: "image/png" });
            rail.onAddImages([file]);
            if (editor.mode === "edit" && editor.attachment && rail.onRemoveImage) rail.onRemoveImage(editor.attachment.id);
            store.close();
          }, "image/png");
        };
        var onKeyDown = function (e) {
          if (e.key === "Escape") { e.stopPropagation(); store.close(); }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
        };

        return React.createElement("div", {
          className: "wb-overlay",
          onPointerDown: function (e) { if (e.target === e.currentTarget) store.close(); },
        },
          React.createElement("div", { className: "wb-panel", ref: panelRef, tabIndex: -1, onKeyDown: onKeyDown },
            React.createElement("div", { className: "wb-title" }, editor.mode === "edit" ? "编辑图片" : "画板 · 绘制示意图"),
            React.createElement("div", { className: "wb-canvas-wrap" },
              React.createElement("canvas", {
                className: "wb-canvas",
                ref: canvasRef,
                onPointerDown: onPointerDown,
                onPointerMove: onPointerMove,
                onPointerUp: endStroke,
                onPointerCancel: endStroke,
              })
            ),
            React.createElement("div", { className: "wb-bar" },
              React.createElement("div", { className: "wb-swatches" },
                COLORS.map(function (c) {
                  return React.createElement("button", {
                    key: c,
                    type: "button",
                    className: "wb-swatch",
                    style: { background: c },
                    "data-active": !erasing && color === c,
                    title: "画笔颜色",
                    onClick: function () { setColor(c); setErasing(false); },
                  });
                })
              ),
              SIZES.map(function (s) {
                return React.createElement("button", {
                  key: s,
                  type: "button",
                  className: "wb-btn",
                  "data-active": size === s,
                  onClick: function () { setSize(s); },
                }, s === 3 ? "细" : s === 6 ? "中" : "粗");
              }),
              React.createElement("button", {
                type: "button",
                className: "wb-btn",
                "data-active": erasing,
                onClick: function () { setErasing(!erasing); },
              }, "橡皮"),
              React.createElement("button", { type: "button", className: "wb-btn", disabled: undoCount === 0, onClick: undo }, "撤销"),
              React.createElement("button", { type: "button", className: "wb-btn", onClick: clearAll }, "清空"),
              React.createElement("span", { className: "wb-spacer" }),
              React.createElement("button", { type: "button", className: "wb-btn", onClick: function () { store.close(); } }, "取消"),
              React.createElement("button", { type: "button", className: "wb-btn-primary", onClick: insert }, "插入到输入框")
            ),
            React.createElement("div", { className: "wb-hint" }, "Esc 关闭 · Ctrl+Z 撤销 · 编辑模式下插入将替换原图片")
          )
        );
      }

      function Overlay() {
        var editor = useEditor();
        if (!editor) return null;
        return React.createElement(Editor, { editor: editor });
      }

      // ---- registrations ----
      ctx.slots.inject("conversation.input.left", function () {
        return ctx.slots.register({
          name: "conversation.input.left",
          id: "sketchpad-entry",
          order: 10,
          label: "画板",
        }, function () {
          return React.createElement(LeftEntry);
        });
      });
      ctx.slots.inject("conversation.input.attachments", function () {
        // Single slot: the shipped rail sits at priority 0; a lower priority
        // shadows it (lowest renders) while leaving the occupant intact.
        return ctx.slots.register({
          name: "conversation.input.attachments",
          priority: -1,
        }, function (props) {
          return React.createElement(Rail, props);
        });
      });
      ctx.slots.inject("shell.overlay", function () {
        return ctx.slots.register({
          name: "shell.overlay",
          id: "sketchpad-overlay",
          order: 100,
          label: "画板编辑器",
        }, function () {
          return React.createElement(Overlay);
        });
      });
    }

    exports.apply = apply;
    exports.inject = ["slots"];
    return module.exports;
  }
});
