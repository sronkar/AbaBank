import { isValidCode, normalizeCode } from "@/lib/roblox-bridge";

// Serves a ready-to-install Roblox Studio plugin (.lua) with this app's URL and
// the user's pairing code baked in. Save the download into your Roblox "Plugins"
// folder (or right-click it in Studio's Explorer > Save as Local Plugin).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawCode = url.searchParams.get("code") ?? "";
  const code = isValidCode(rawCode) ? normalizeCode(rawCode) : "PASTE-YOUR-CODE";

  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("host") ?? url.host;
  const base = `${proto}://${host}`;

  const lua = `--[[
	Studio Code Generator - companion plugin
	------------------------------------------------
	1. Click the "Connect" button in the Studio Code toolbar.
	2. In the web app, click "Send to Studio".
	3. The generated script appears in your game automatically.

	App URL:      ${base}
	Pairing code: ${code}

	The first time it runs, Studio will ask permission to allow HTTP
	requests to the app URL above - click Allow.
]]

local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local Selection = game:GetService("Selection")
local ServerScriptService = game:GetService("ServerScriptService")
local StarterPlayer = game:GetService("StarterPlayer")

local BASE_URL = "${base}"
local CODE = "${code}"
local PULL_URL = BASE_URL .. "/api/roblox/pull?code=" .. CODE

local toolbar = plugin:CreateToolbar("Studio Code")
local button = toolbar:CreateButton(
	"Connect",
	"Sync generated scripts from the web app",
	"rbxasset://textures/ui/GuiImagePlaceholder.png"
)
button.ClickableWhenViewportHidden = true

local function insertJob(job)
	local scriptType = job.scriptType or "Script"
	local target = job.target or "ServerScriptService"
	local title = tostring(job.title or "GeneratedScript")

	local newScript = Instance.new(scriptType)
	newScript.Name = title
	newScript.Source = tostring(job.code or "")

	ChangeHistoryService:SetWaypoint("Before Studio Code insert")

	if target == "WorkspacePart" then
		local part = Instance.new("Part")
		part.Name = title
		part.Size = Vector3.new(6, 1, 6)
		part.Position = Vector3.new(0, 5, 0)
		part.Anchored = true
		part.BrickColor = BrickColor.new("Bright green")
		newScript.Parent = part
		part.Parent = workspace
		Selection:Set({ part })
	elseif target == "StarterPlayerScripts" then
		local container = StarterPlayer:FindFirstChild("StarterPlayerScripts")
		if not container then
			container = Instance.new("StarterPlayerScripts")
			container.Parent = StarterPlayer
		end
		newScript.Parent = container
		Selection:Set({ newScript })
	else
		newScript.Parent = ServerScriptService
		Selection:Set({ newScript })
	end

	ChangeHistoryService:SetWaypoint("Inserted " .. title)
	print("[Studio Code] Added '" .. title .. "' (" .. scriptType .. ") to " .. target)
end

local function poll()
	local ok, response = pcall(function()
		return HttpService:GetAsync(PULL_URL, false)
	end)
	if not ok then
		warn("[Studio Code] Cannot reach the app - is the URL right and HTTP allowed? " .. tostring(response))
		return
	end

	local decodeOk, decoded = pcall(function()
		return HttpService:JSONDecode(response)
	end)
	if not decodeOk or type(decoded) ~= "table" then
		return
	end

	if type(decoded.jobs) == "table" then
		for _, job in ipairs(decoded.jobs) do
			local insertOk, err = pcall(insertJob, job)
			if not insertOk then
				warn("[Studio Code] Could not insert a script: " .. tostring(err))
			end
		end
	end
end

local running = false

button.Click:Connect(function()
	running = not running
	button:SetActive(running)
	if running then
		print("[Studio Code] Connected as " .. CODE .. ". Waiting for scripts...")
		task.spawn(function()
			while running do
				poll()
				task.wait(2)
			end
			print("[Studio Code] Disconnected.")
		end)
	end
end)

plugin.Unloading:Connect(function()
	running = false
end)
`;

  return new Response(lua, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="StudioCodePlugin.lua"',
      "Cache-Control": "no-store",
    },
  });
}
