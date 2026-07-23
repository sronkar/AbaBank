import { enqueueJob, isConnected, isValidCode, normalizeCode } from "@/lib/roblox-bridge";

const SCRIPT_TYPES = new Set(["Script", "LocalScript", "ModuleScript"]);
const TARGETS = new Set(["ServerScriptService", "StarterPlayerScripts", "WorkspacePart"]);
const MAX_SOURCE = 20_000;

// The web app calls this to hand a generated script to the paired Studio plugin.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const pairCode = typeof b.pairCode === "string" ? normalizeCode(b.pairCode) : "";
  const source = typeof b.source === "string" ? b.source : "";
  const scriptType = typeof b.scriptType === "string" ? b.scriptType : "";
  const target = typeof b.target === "string" ? b.target : "";
  const title = typeof b.title === "string" ? b.title.slice(0, 80) : "Script";
  const id = typeof b.id === "string" ? b.id.slice(0, 80) : "script";

  if (!isValidCode(pairCode)) {
    return Response.json({ error: "Invalid pairing code" }, { status: 400 });
  }
  if (!source.trim() || source.length > MAX_SOURCE) {
    return Response.json({ error: "Missing or oversized script" }, { status: 400 });
  }
  if (!SCRIPT_TYPES.has(scriptType) || !TARGETS.has(target)) {
    return Response.json({ error: "Bad scriptType or target" }, { status: 400 });
  }

  enqueueJob(pairCode, {
    id,
    title,
    scriptType: scriptType as "Script" | "LocalScript" | "ModuleScript",
    target: target as "ServerScriptService" | "StarterPlayerScripts" | "WorkspacePart",
    code: source,
  });

  return Response.json({ ok: true, connected: isConnected(pairCode) });
}
