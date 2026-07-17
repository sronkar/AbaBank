import { getSettings } from "./settings";

/** Push a notification to the family's ntfy.sh topic, if configured. Never throws. */
export async function notify(title: string, message: string): Promise<void> {
  const topic = getSettings().ntfyTopic;
  if (!topic) return;
  try {
    await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: "POST",
      headers: { Title: title },
      body: message,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error("ntfy notification failed:", err);
  }
}
