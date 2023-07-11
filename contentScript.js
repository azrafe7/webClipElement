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

  let elementPicker = null;

  // from https://github.com/gorhill/uBlock/blob/master/src/js/scriptlets/epicker.js
  // zapElementAtPoint() function
  function unlockScreenIfLocked(elemToRemove) {
    const getStyleValue = (elem, prop) => {
      const style = window.getComputedStyle(elem);
      return style ? style[prop] : '';
    };

    // Heuristic to detect scroll-locking: remove such lock when detected.
    let maybeScrollLocked = elemToRemove.shadowRoot instanceof DocumentFragment;
    if (maybeScrollLocked === false) {
      let elem = elemToRemove;
      do {
        maybeScrollLocked =
          parseInt(getStyleValue(elem, 'zIndex'), 10) >= 1000 ||
          getStyleValue(elem, 'position') === 'fixed';
        elem = elem.parentElement;
      } while (elem !== null && maybeScrollLocked === false);
    }
    if (maybeScrollLocked) {
      const doc = document;
      if (getStyleValue(doc.body, 'overflowY') === 'hidden') {
        doc.body.style.setProperty('overflow', 'auto', 'important');
      }
      if (getStyleValue(doc.body, 'position') === 'fixed') {
        doc.body.style.setProperty('position', 'initial', 'important');
      }
      if (getStyleValue(doc.documentElement, 'position') === 'fixed') {
        doc.documentElement.style.setProperty('position', 'initial', 'important');
      }
      if (getStyleValue(doc.documentElement, 'overflowY') === 'hidden') {
        doc.documentElement.style.setProperty('overflow', 'auto', 'important');
      }
    }
  };
  
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("[WebClipElement:CTX]", msg);
    const { event, data } = msg;

    if (event === "enablePicker") {
      elementPicker = new ElementPicker(options);
      elementPicker.action = {
        trigger: "mouseup",
        callback: ((target) => {
          console.log("[WebClipElement:CTX] target:", target);
          console.log("[WebClipElement:CTX] info:", elementPicker.hoverInfo);
          // sendResponse(elementPicker.hoverInfo);
          unlockScreenIfLocked(target);
          target.remove();
          elementPicker.close();
          elementPicker = null;
        })
      }
    }

    // return true; // keep port alive
  });

  // close picker when pressing ESC
  window.addEventListener('keyup', function(e) {
    if (e.keyCode == 27) {
      if (elementPicker) {
        elementPicker.close();
        elementPicker = null;
        console.log("[WebClipElement:CTX] user aborted");
      }
    }
  });

})();
