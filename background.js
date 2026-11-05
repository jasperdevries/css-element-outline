browser.action.onClicked.addListener(async (tab) => {
  const results = await browser.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    files: ["overlay.js"],
  });
  // overlay.js returns true when it switched on, false when it switched off.
  const top = results.find((r) => r.frameId === 0) || results[0];
  const on = top && top.result === true;
  await browser.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#e6194b" });
  await browser.action.setBadgeText({ tabId: tab.id, text: on ? "ON" : "" });
});

// A page reload or navigation removes the overlay, so reset the badge too.
browser.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading") browser.action.setBadgeText({ tabId, text: "" });
});
