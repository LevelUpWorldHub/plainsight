chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "plainsight-redact",
      title: "Redact selection with PlainSight",
      contexts: ["selection"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "plainsight-redact" || !info.selectionText) return;
  chrome.storage.session.set({
    pending: {
      text: info.selectionText,
      destination: "Selection",
      tabId: tab?.id ?? null,
    },
  });
  if (tab?.id !== undefined) {
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
      chrome.action.setBadgeText({ text: "!", tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({ color: "#1d4f4a", tabId: tab.id });
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "OPEN_OUTBOX") {
    const tabId = sender.tab?.id ?? null;
    chrome.storage.session.set({
      pending: {
        text: message.text ?? "",
        destination: message.destination ?? "Other",
        tabId,
      },
    });
    if (tabId !== null) {
      chrome.sidePanel.open({ tabId }).catch(() => {
        chrome.action.setBadgeText({ text: "!", tabId });
      });
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "REPLACE_FIELD") {
    if (typeof message.tabId === "number") {
      chrome.tabs.sendMessage(message.tabId, {
        type: "REPLACE_FIELD",
        text: message.text ?? "",
      });
    }
    sendResponse({ ok: true });
    return true;
  }

  return false;
});
