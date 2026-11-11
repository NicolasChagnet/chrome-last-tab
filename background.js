const guardUrl = chrome.runtime.getURL("guard.html");
const creatingGuard = new Set();

async function ensureGuard(windowId) {
  if (creatingGuard.has(windowId)) return;
  creatingGuard.add(windowId);

  try {
    const tabs = await chrome.tabs.query({ windowId });
    if (!tabs.some((tab) => tab.url === guardUrl)) {
      await chrome.tabs.create({ windowId, url: guardUrl, pinned: true, active: false });
    }
  } catch {
  } finally {
    creatingGuard.delete(windowId);
  }
}

async function ensureGuardsForOpenWindows() {
  const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
  await Promise.all(windows.map((window) => ensureGuard(window.id)));
}

chrome.runtime.onInstalled.addListener(ensureGuardsForOpenWindows);
chrome.runtime.onStartup.addListener(ensureGuardsForOpenWindows);
chrome.windows.onCreated.addListener((window) => {
  if (window.type === "normal") ensureGuard(window.id);
});

chrome.tabs.onRemoved.addListener(async (_tabId, removeInfo) => {
  if (removeInfo.isWindowClosing) return;

  const tabs = await chrome.tabs.query({ windowId: removeInfo.windowId });
  const guard = tabs.find((tab) => tab.url === guardUrl);

  if (!guard && tabs.length > 0) {
    await ensureGuard(removeInfo.windowId);
  } else if (guard && tabs.length === 1) {
    await chrome.tabs.create({ windowId: removeInfo.windowId });
  }
});
