import { isConnected, isValidCode, normalizeCode } from "@/lib/roblox-bridge";

// The web UI polls this to show whether a Studio plugin is currently paired.
export async function GET(req: Request) {
  const code = normalizeCode(new URL(req.url).searchParams.get("code") ?? "");
  if (!isValidCode(code)) {
    return Response.json({ error: "Invalid pairing code" }, { status: 400 });
  }
  return Response.json(
    { connected: isConnected(code) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
