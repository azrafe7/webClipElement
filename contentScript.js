"use strict";

(async () => {
  let manifest = chrome.runtime.getManifest();
  console.log(manifest.name + " v" + manifest.version);

  const HIGHLIGHT_RED = "rgba(250, 70, 60, 0.5)";
  const HIGHLIGHT_GREEN = "rgba(17, 193, 12, 0.5)";
  const HIGHLIGHT_BG_COLOR = HIGHLIGHT_GREEN;

  const OUTLINE_RED = "rgba(250, 70, 60, 0.75)";
  const OUTLINE_GREEN = "rgba(17, 193, 12, 0.90)";
  const OUTLINE_COLOR = OUTLINE_GREEN;

  /* if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // dark mode
    HIGHLIGHT_BG_COLOR = HIGHLIGHT_DARK;
    OUTLINE_COLOR = OUTLINE_DARK;
  } */

  let options = {
    // container: document.body,
    enabled: false,
    selectors: "*",
    background: HIGHLIGHT_BG_COLOR,
    borderWidth: 0,
    outlineWidth: 1,
    outlineColor: OUTLINE_COLOR,
    transition: "",
    ignoreElements: [document.body],
    action: {},
    hoverBoxInfoId: 'webclip_picker_info',
  }

  // create "disabled" elementPicker on page load
  let elementPicker = new ElementPicker(options);
  elementPicker.action = {
    trigger: "mouseup",
    
    // IMPORTANT!
    callback: ((event, target) => {
      console.log("[WebClipElement:CTX] target:", target);
      console.log("[WebClipElement:CTX] info:", elementPicker.hoverInfo);
      // unlockScreenIfLocked(target);
      // target.remove();
      elementPicker.hoverInfo.element = null; // not serializable
      const hoverInfoClone = structuredClone(elementPicker.hoverInfo);
      setTimeout(() => { // to ensure picker overlay is removed
        chrome.runtime.sendMessage(
          {
            event: "takeScreenshot",
            data: {hoverInfo: hoverInfoClone, continuePicking: event.shiftKey},
          },
        );
      }, 50);
      
      elementPicker.enabled = false;
    })
  }

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

  function getVisibleRect(rect) {
    let visibleRect = DOMRect.fromRect(rect);

    if (visibleRect.x < 0) {
      visibleRect.width += visibleRect.x;
      visibleRect.x = 0;
    }
    if (visibleRect.y < 0) {
      visibleRect.height += visibleRect.y;
      visibleRect.y = 0;
    }
    if (visibleRect.x + visibleRect.width > window.innerWidth) {
      visibleRect.width = window.innerWidth - visibleRect.x;
    }
    if (visibleRect.y + visibleRect.height > window.innerHeight) {
      visibleRect.height = window.innerHeight - visibleRect.y;
    }
    return visibleRect;
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("[WebClipElement:CTX]", msg);
    const { event, data } = msg;

    if (event === "enablePicker") {
      elementPicker.enabled = true;
    } else if (event === "takenScreenshot") {
      let dataURL = data.dataURL;
      let hoverInfo = data.hoverInfo;
      let continuePicking = data?.continuePicking;
      
      if (continuePicking) {
        elementPicker.enabled = true;
      }
      
      let image = new Image();
      image.onload = () => {
        let visibleRect = getVisibleRect(hoverInfo.clientRect);
        console.log("[WebClipElement:CTX] cropping...", visibleRect);
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');

        const zoomLevel = window.devicePixelRatio;
        if (zoomLevel != 1.0) {
          visibleRect.x *= zoomLevel;
          visibleRect.y *= zoomLevel;
          visibleRect.width *= zoomLevel;
          visibleRect.height *= zoomLevel;
        }
        canvas.width = visibleRect.width;
        canvas.height = visibleRect.height;
        
        ctx.drawImage(image, visibleRect.x, visibleRect.y, visibleRect.width, visibleRect.height,
                             0, 0, visibleRect.width, visibleRect.height);
        
        ((croppedDataURL) => {
          canvas = null;
          ctx = null;
          console.log("[WebClipElement:CTX] send cropped dataURL", croppedDataURL);
          chrome.runtime.sendMessage(
            {
              event: "openCroppedInNewTab",
              data: {
                dataURL: croppedDataURL,
                continuePicking: continuePicking,
              },
            },
          );
        })(canvas.toDataURL());
      };
      image.src = dataURL;
    }
  });

  // close picker when pressing ESC
  window.addEventListener('keyup', function(e) {
    if (e.keyCode == 27 && elementPicker.enabled) {
      elementPicker.enabled = false;
      console.log("[WebClipElement:CTX] user aborted");
    }
  });

})();
