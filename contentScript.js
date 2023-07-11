"use strict";

(async () => {
  let manifest = chrome.runtime.getManifest();
  console.log(manifest.name + " v" + manifest.version);

  const HIGHLIGHT_DARK = "rgba(250, 70, 60, 0.5)";
  const HIGHLIGHT_LIGHT = "rgba(60, 250, 70, 0.25)";
  const HIGHLIGHT_BG_COLOR = HIGHLIGHT_LIGHT;

  const OUTLINE_DARK = "rgba(250, 70, 60, 0.75)";
  const OUTLINE_LIGHT = "rgba(60, 250, 70, 0.5)";
  const OUTLINE_COLOR = OUTLINE_LIGHT;

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // dark mode
    HIGHLIGHT_BG_COLOR = HIGHLIGHT_DARK;
    OUTLINE_COLOR = OUTLINE_DARK;
  }

  let options = {
    // container: document.body,
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

  function destroyPicker() {
    if (elementPicker) {
      elementPicker.close();
      elementPicker = null;
    }
  }

  chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    console.log("[WebClipElement:CTX]", msg);
    const { event, data } = msg;

    if (event === "enablePicker") {
      destroyPicker();
      elementPicker = new ElementPicker(options);
      elementPicker.action = {
        trigger: "mouseup",
        callback: ((target) => {
          console.log("[WebClipElement:CTX] target:", target);
          console.log("[WebClipElement:CTX] info:", elementPicker.hoverInfo);
          // unlockScreenIfLocked(target);
          // target.remove();
          elementPicker.hoverInfo.element = null;
          const hoverInfoClone = structuredClone(elementPicker.hoverInfo);
          window.requestAnimationFrame(destroyPicker);

          chrome.runtime.sendMessage(
            {
              event: "takeScreenshot",
              data: {hoverInfo: hoverInfoClone},
            },
          );
        })
      }
    } else if (event === "takenScreenshot") {
      let dataURL = data.dataURL;
      let hoverInfo = data.hoverInfo;
      let image = new Image();
      image.onload = () => {
        console.log("[WebClipElement:CTX] cropping...");
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        canvas.width = hoverInfo.width;
        canvas.height = hoverInfo.height;
        ctx.drawImage(image, hoverInfo.targetOffsetLeft, hoverInfo.targetOffsetTop, canvas.width, canvas.height,
                             0, 0, canvas.width, canvas.height);
        let croppedDataURL = canvas.toDataURL();
        canvas = null;
        ctx = null;
        console.log("[WebClipElement:CTX] send cropped dataURL", croppedDataURL);
        chrome.runtime.sendMessage(
          {
            event: "openCroppedInNewTab",
            data: croppedDataURL,
          },
        );
      };
      image.src = dataURL;
    }
  });

  // close picker when pressing ESC
  window.addEventListener('keyup', function(e) {
    if (e.keyCode == 27) {
      if (elementPicker) {
        destroyPicker();
        console.log("[WebClipElement:CTX] user aborted");
      }
    }
  });

})();

async function sleep(ms) {
  console.log(`[WebClipElement:CTX] sleeping ${ms}ms...`);
  return new Promise(r => setTimeout(r, ms));
}
