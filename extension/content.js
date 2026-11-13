const AI_HOSTS = {
  "chatgpt.com": "ChatGPT",
  "chat.openai.com": "ChatGPT",
  "gemini.google.com": "Gemini",
  "claude.ai": "Claude",
};

let activeField = null;
let button = null;

function destinationForHost(host) {
  return AI_HOSTS[host] || "Clinic web form";
}

function isEditable(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element instanceof HTMLTextAreaElement) return !element.disabled && !element.readOnly;
  if (element instanceof HTMLInputElement) {
    const allowed = ["text", "search", "email", "tel", "url", ""];
    return allowed.includes(element.type) && !element.disabled && !element.readOnly;
  }
  return element.isContentEditable;
}

function readField(element) {
  if (!element) return "";
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element.value;
  }
  return element.innerText || "";
}

function writeField(element, value) {
  element.focus();
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    const prototype =
      element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor?.set) descriptor.set.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection?.removeAllRanges();
  selection?.addRange(range);
  document.execCommand("insertText", false, value);
}

function placeButton(element) {
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "plainsight-check";
    button.textContent = "Check with PlainSight";
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      const text = readField(activeField);
      chrome.runtime.sendMessage({
        type: "OPEN_OUTBOX",
        text,
        destination: destinationForHost(location.hostname),
      });
    });
    document.documentElement.appendChild(button);
  }
  const rect = element.getBoundingClientRect();
  const top = Math.max(8, rect.top - 36);
  const left = Math.min(window.innerWidth - 180, Math.max(8, rect.right - 168));
  button.style.top = `${top}px`;
  button.style.left = `${left}px`;
  button.hidden = false;
}

document.addEventListener("focusin", (event) => {
  const target = event.target;
  if (!isEditable(target)) return;
  activeField = target;
  placeButton(target);
});

document.addEventListener(
  "focusout",
  () => {
    window.setTimeout(() => {
      if (!button) return;
      const next = document.activeElement;
      if (next === button || next === activeField) return;
      button.hidden = true;
    }, 200);
  },
  true,
);

window.addEventListener("scroll", () => {
  if (activeField && button && !button.hidden) placeButton(activeField);
}, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "REPLACE_FIELD" || !activeField) {
    sendResponse({ ok: false });
    return;
  }
  writeField(activeField, message.text ?? "");
  sendResponse({ ok: true });
});
