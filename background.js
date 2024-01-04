"use strict";

let manifest = chrome.runtime.getManifest();
console.log(manifest.name + " v" + manifest.version);

// add contextMenu entry to action button
function createContextMenu() {
  chrome.contextMenus.removeAll(function() {
    chrome.contextMenus.create({
      id: "WebClipElement_onPageScreenshotContextMenu",
      title: "Take page screenshot...",
      contexts: ["action"],
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

// enable picker when clicking the browser action
chrome.action.onClicked.addListener(async (tab) => {
  console.log("[WebClipElement:BG] togglePicker");
  chrome.tabs.sendMessage(
    tab.id,
    {
      event: "togglePicker",
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
    chrome.tabs.sendMessage(activeTab.id, {event: "takenScreenshot", data:{dataURL: dataURL, hoverInfo: data.hoverInfo, continuePicking: data?.continuePicking}});
  } else if (event === "openCroppedInNewTab") {
    console.log("[WebClipElement:BG] opening cropped image in new tab...");
    let dataURL = data.dataURL;
    let focusNewTab = !(data?.continuePicking);
    let [activeTab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
    chrome.tabs.create({url: dataURL, index: activeTab.index + 1, active: focusNewTab});
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log("[WebClipElement:BG] onContextMenuClicked:", [info, tab]);

  if (info.menuItemId === "WebClipElement_onPageScreenshotContextMenu") {
    console.log("[WebClipElement:BG] taking page screenshot...");
    chrome.tabs.sendMessage(
      tab.id,
      {
        event: "togglePicker",
        data: { enable: false },
      }
    );
    let dataURL = await takeScreenshot();
    let focusNewTab = true;
    let [activeTab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
    chrome.tabs.create({url: dataURL, index: activeTab.index + 1, active: focusNewTab});
  }
});
