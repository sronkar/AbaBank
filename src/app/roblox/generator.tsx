"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  matchScripts,
  targetFor,
  EXAMPLE_PROMPTS,
  type RobloxTemplate,
} from "@/lib/roblox";

type SendState = "idle" | "sending" | "sent" | "error";

function makeClientCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

// A stable, browser-persisted pairing code. Cached so getSnapshot stays pure
// (returns the same string every call) — the code is created at most once.
let cachedCode: string | null = null;
function readPairingCode(): string {
  if (cachedCode) return cachedCode;
  try {
    let c = localStorage.getItem("studio-code-pair") ?? "";
    if (!/^[A-Z0-9]{6}$/.test(c)) {
      c = makeClientCode();
      localStorage.setItem("studio-code-pair", c);
    }
    cachedCode = c;
  } catch {
    cachedCode = makeClientCode();
  }
  return cachedCode;
}

const noopSubscribe = () => () => {};

/** Client-only pairing code, matching the app's useSyncExternalStore pattern. */
function usePairingCode(): string {
  return useSyncExternalStore(noopSubscribe, readPairingCode, () => "");
}

export function RobloxGenerator() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const matches = useMemo(() => (submitted ? matchScripts(query) : []), [submitted, query]);
  const best = useMemo(() => {
    if (matches.length === 0) return null;
    return matches.find((m) => m.template.id === selectedId)?.template ?? matches[0].template;
  }, [matches, selectedId]);
  const alternatives = matches.filter((m) => m.template.id !== best?.id).slice(0, 6);

  const runSearch = useCallback((text: string) => {
    setQuery(text);
    setSubmitted(true);
    setSelectedId(null);
  }, []);

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
      >
        <label className="label">What script do you want?</label>
        <div className="flex gap-2 flex-col sm:flex-row">
          <input
            className="input"
            placeholder="e.g. a kill brick, a coin leaderboard, double jump..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-primary shrink-0">
            ✨ Generate
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((p) => (
          <button key={p} type="button" className="chip" onClick={() => runSearch(p)}>
            {p}
          </button>
        ))}
      </div>

      {best ? (
        <ResultCard template={best} alternatives={alternatives} onPick={setSelectedId} />
      ) : submitted ? (
        <div className="card accent-coral">
          <p className="font-display font-semibold text-lg">
            🤔 Hmm, I don&apos;t have a script for that yet.
          </p>
          <p className="text-muted mt-1">
            Try one of the examples above, or use simpler words like{" "}
            <span className="font-bold">&quot;kill brick&quot;</span>,{" "}
            <span className="font-bold">&quot;teleport&quot;</span> or{" "}
            <span className="font-bold">&quot;leaderboard&quot;</span>.
          </p>
        </div>
      ) : null}

      <StudioBridge template={best} />
    </div>
  );
}

function ResultCard({
  template,
  alternatives,
  onPick,
}: {
  template: RobloxTemplate;
  alternatives: { template: RobloxTemplate }[];
  onPick: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(template.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card accent-lavender space-y-3">
        <div className="flex items-center gap-3">
          <div className="emoji-badge">{template.emoji}</div>
          <div>
            <h2 className="text-xl font-display font-semibold">{template.title}</h2>
            <p className="text-muted text-sm">{template.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="tag">📄 {template.scriptType}</span>
          <span className="tag">📍 {template.where}</span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={copy}
            className="btn btn-subtle absolute top-2 right-2 !py-1 !px-2.5 text-sm z-10"
          >
            {copied ? "✅ Copied" : "📋 Copy"}
          </button>
          <pre className="codeblock">
            <code>{template.code}</code>
          </pre>
        </div>
      </div>

      {alternatives.length > 0 && (
        <div>
          <p className="label">Or maybe you meant…</p>
          <div className="flex flex-wrap gap-2">
            {alternatives.map(({ template: alt }) => (
              <button key={alt.id} type="button" className="chip" onClick={() => onPick(alt.id)}>
                {alt.emoji} {alt.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StudioBridge({ template }: { template: RobloxTemplate | null }) {
  const code = usePairingCode();
  const [connected, setConnected] = useState(false);
  const [send, setSend] = useState<SendState>("idle");
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll for a connected plugin so the user sees when pairing works.
  useEffect(() => {
    if (!code) return;
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch(`/api/roblox/status?code=${code}`, { cache: "no-store" });
        const data = await res.json();
        if (alive) setConnected(Boolean(data.connected));
      } catch {
        /* ignore */
      }
    };
    check();
    const t = setInterval(check, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [code]);

  const sendToStudio = async () => {
    if (!template || !code) return;
    setSend("sending");
    try {
      const res = await fetch("/api/roblox/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairCode: code,
          id: template.id,
          title: template.title,
          scriptType: template.scriptType,
          target: targetFor(template.id),
          source: template.code,
        }),
      });
      if (!res.ok) throw new Error("push failed");
      const data = await res.json();
      setConnected(Boolean(data.connected));
      setSend("sent");
    } catch {
      setSend("error");
    }
    if (sendTimer.current) clearTimeout(sendTimer.current);
    sendTimer.current = setTimeout(() => setSend("idle"), 2500);
  };

  return (
    <div className="card accent-mint space-y-3">
      <div className="flex items-center gap-3">
        <div className="emoji-badge">🔌</div>
        <div>
          <h2 className="text-lg font-display font-semibold">Connect to Roblox Studio</h2>
          <p className="text-muted text-sm">
            Install the plugin once, then send scripts straight into your game.
          </p>
        </div>
        <span
          className={`tag ml-auto ${connected ? "banner-good" : ""}`}
          title="Whether the Studio plugin is currently talking to this page"
        >
          {connected ? "🟢 Studio connected" : "⚪ Not connected"}
        </span>
      </div>

      <ol className="text-sm space-y-2 list-decimal ml-5 marker:font-bold marker:text-[var(--mint-deep)]">
        <li>
          <a className="underline font-bold" href={`/api/roblox/plugin?code=${code}`} download>
            Download the plugin
          </a>{" "}
          and, in Roblox Studio, right-click it in the Explorer or use{" "}
          <span className="font-bold">Plugins ▸ Plugins Folder</span> to install it.
        </li>
        <li>
          Click <span className="font-bold">Connect</span> on the new{" "}
          <span className="font-bold">Studio Code</span> toolbar button (allow HTTP when asked).
        </li>
        <li>
          Generate a script above, then hit{" "}
          <span className="font-bold">Send to Studio</span>.
        </li>
      </ol>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <span className="tag">
          Pairing code:&nbsp;<span className="tabular-nums tracking-widest">{code || "…"}</span>
        </span>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!template || send === "sending"}
          onClick={sendToStudio}
        >
          {send === "sending"
            ? "Sending…"
            : send === "sent"
              ? "✅ Sent to Studio"
              : send === "error"
                ? "⚠️ Try again"
                : "🚀 Send to Studio"}
        </button>
        {!template && (
          <span className="text-muted text-sm">Generate a script first ☝️</span>
        )}
      </div>
    </div>
  );
}
