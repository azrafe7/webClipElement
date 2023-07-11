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
    }
  );
});

async function takeScreenshot() {
  let dataURL = await chrome.tabs.captureVisibleTab(null, {
      format: 'png'
    },
  );
  return dataURL;
}

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  console.log("[WebClipElement:BG]", msg);
  const { event, data } = msg;

  if (event === "takeScreenshot") {
    console.log("[WebClipElement:BG] taking screenshot...");
    let dataURL = await takeScreenshot();
    console.log("[WebClipElement:BG]", dataURL);
    let [activeTab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
    chrome.tabs.sendMessage(activeTab.id, {event: "takenScreenshot", data:{dataURL: dataURL, hoverInfo: data.hoverInfo}});
  } else if (event === "openCroppedInNewTab") {
    console.log("[WebClipElement:BG] opening cropped image in new tab...");
    let dataURL = data;
    let [activeTab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
    chrome.tabs.create({url: dataURL, index: activeTab.index + 1});
  }
});
