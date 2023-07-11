"use strict";

let manifest = chrome.runtime.getManifest();
console.log(manifest.name + " v" + manifest.version);

// enable picker when clicking the browser action
chrome.action.onClicked.addListener(async (tab) => {
  console.log("[WebClipElement:BG] enablePicker");
  chrome.tabs.sendMessage(
    tab.id,
    {
      event: "enablePicker",
      data: null,
    }/* ,
    function(response) {
      console.log("[WebClipElement:BG] response:");
      console.log(response);
    } */
  );
});