const CHANNEL = "jomnongdai-display";
const LIVE_KEY = "jomnongdai.liveDisplay.v1";

export function publishDisplay(payload) {
  const body = JSON.stringify(payload);
  try {
    localStorage.setItem(LIVE_KEY, body);
  } catch {
    /* The second window can still receive the channel message. */
  }
  const channel = new BroadcastChannel(CHANNEL);
  channel.postMessage(payload);
  channel.close();
}

export function readDisplay() {
  try {
    const raw = localStorage.getItem(LIVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function subscribeDisplay(onPayload) {
  const channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (event) => onPayload(event.data);
  const onStorage = (event) => {
    if (event.key === LIVE_KEY && event.newValue) {
      try {
        onPayload(JSON.parse(event.newValue));
      } catch {
        /* Ignore malformed display payloads. */
      }
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    channel.close();
    window.removeEventListener("storage", onStorage);
  };
}
