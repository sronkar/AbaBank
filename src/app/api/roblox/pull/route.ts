import { claimJobs, isValidCode, normalizeCode } from "@/lib/roblox-bridge";

// The Studio plugin polls this to fetch (and drain) any scripts waiting for it.
export async function GET(req: Request) {
  const code = normalizeCode(new URL(req.url).searchParams.get("code") ?? "");
  if (!isValidCode(code)) {
    return Response.json({ error: "Invalid pairing code" }, { status: 400 });
  }
  const jobs = claimJobs(code);
  return Response.json(
    { jobs },
    { headers: { "Cache-Control": "no-store" } },
  );
}
