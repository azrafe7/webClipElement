"use strict";

(() => {
  let manifest = chrome.runtime.getManifest();
  console.log(manifest.name + " v" + manifest.version);

  const HIGHLIGHT_LIGHT = "rgba(250, 70, 60, 0.5)";
  const HIGHLIGHT_DARK = "rgba(60, 70, 250, 0.5)";
  const HIGHLIGHT_BG_COLOR = HIGHLIGHT_LIGHT;

  const OUTLINE_LIGHT = "rgba(250, 70, 60, 0.75)";
  const OUTLINE_DARK = "rgba(60, 70, 250, 0.75)";
  const OUTLINE_COLOR = OUTLINE_LIGHT;

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // dark mode
    HIGHLIGHT_BG_COLOR = HIGHLIGHT_DARK;
  }

  let options = {
    container: document.body,
    selectors: "*",
    background: HIGHLIGHT_BG_COLOR,
    borderWidth: 0,
    outlineWidth: 1,
    outlineColor: OUTLINE_COLOR,
    transition: "",
    ignoreElements: [document.body],
    action: {}
  }

  let elementPicker = new ElementPicker(options);

})();
