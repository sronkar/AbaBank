// A little offline "code generator" for Roblox Studio.
//
// The user types what they want ("kill brick", "coin leaderboard", "double
// jump") and we match it against a library of hand-written, ready-to-paste
// Luau scripts. Everything here is pure so it runs on the client and is easy
// to unit test — no model, no network, no surprises.

export type ScriptType = "Script" | "LocalScript" | "ModuleScript";

export interface RobloxTemplate {
  id: string;
  title: string;
  emoji: string;
  /** One-line explanation of what the script does. */
  description: string;
  /** Words/phrases we match the user's request against. */
  keywords: string[];
  /** The kind of script object to create in Studio. */
  scriptType: ScriptType;
  /** Plain-English "put it here" instructions. */
  where: string;
  /** The Luau source, ready to copy into Studio. */
  code: string;
}

// NOTE: keep the Luau below free of backticks and the `${` sequence so it can
// live safely inside JS template literals.
export const TEMPLATES: RobloxTemplate[] = [
  {
    id: "leaderstats",
    title: "Coin leaderboard",
    emoji: "🏆",
    description: "Gives every player a leaderboard with a Coins value that shows in the top-right.",
    keywords: ["leaderboard", "leaderstats", "coins", "points", "score", "cash", "money", "stats"],
    scriptType: "Script",
    where: "ServerScriptService",
    code: `-- Gives every player a leaderboard with "Coins"
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	leaderstats.Parent = player

	local coins = Instance.new("IntValue")
	coins.Name = "Coins"
	coins.Value = 0
	coins.Parent = leaderstats
end)`,
  },
  {
    id: "kill-brick",
    title: "Kill brick",
    emoji: "💀",
    description: "A part that kills any player who touches it.",
    keywords: ["kill", "brick", "kill brick", "death", "die", "touch kill", "trap"],
    scriptType: "Script",
    where: "Inside a Part (in Workspace)",
    code: `-- Put this Script inside a Part. Touching the part kills the player.
local part = script.Parent

part.Touched:Connect(function(hit)
	local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.Health = 0
	end
end)`,
  },
  {
    id: "heal-brick",
    title: "Healing pad",
    emoji: "❤️‍🩹",
    description: "A part that fully heals any player who steps on it.",
    keywords: ["heal", "healing", "health", "medkit", "regen", "restore", "heal brick", "heal pad"],
    scriptType: "Script",
    where: "Inside a Part (in Workspace)",
    code: `-- Put this Script inside a Part. Touching it heals the player.
local part = script.Parent

part.Touched:Connect(function(hit)
	local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.Health = humanoid.MaxHealth
	end
end)`,
  },
  {
    id: "teleport-pad",
    title: "Teleport pad",
    emoji: "🌀",
    description: "A part that teleports players to a spot you choose when they touch it.",
    keywords: ["teleport", "teleporter", "pad", "warp", "portal", "tp", "move player"],
    scriptType: "Script",
    where: "Inside a Part (in Workspace)",
    code: `-- Put this Script inside a Part. Touching it teleports the player.
local pad = script.Parent
local TARGET = Vector3.new(0, 50, 0) -- change this to where you want to send players

pad.Touched:Connect(function(hit)
	local root = hit.Parent:FindFirstChild("HumanoidRootPart")
	if root then
		root.CFrame = CFrame.new(TARGET)
	end
end)`,
  },
  {
    id: "color-on-touch",
    title: "Change colour on touch",
    emoji: "🎨",
    description: "A part that turns a random colour every time a player touches it.",
    keywords: ["color", "colour", "change color", "rainbow touch", "recolor", "paint"],
    scriptType: "Script",
    where: "Inside a Part (in Workspace)",
    code: `-- Put this Script inside a Part. Touching it changes its colour.
local part = script.Parent

part.Touched:Connect(function()
	part.Color = Color3.fromRGB(
		math.random(0, 255),
		math.random(0, 255),
		math.random(0, 255)
	)
end)`,
  },
  {
    id: "rainbow-part",
    title: "Rainbow part",
    emoji: "🌈",
    description: "A part that smoothly cycles through every rainbow colour forever.",
    keywords: ["rainbow", "glow", "cycle color", "color loop", "flashing", "disco"],
    scriptType: "Script",
    where: "Inside a Part (in Workspace)",
    code: `-- Put this Script inside a Part to make it cycle through the rainbow.
local part = script.Parent
local RunService = game:GetService("RunService")

local hue = 0
RunService.Heartbeat:Connect(function(deltaTime)
	hue = (hue + deltaTime * 0.2) % 1
	part.Color = Color3.fromHSV(hue, 1, 1)
end)`,
  },
  {
    id: "spinner",
    title: "Spinning part",
    emoji: "🪀",
    description: "Makes a part spin on the spot. Anchor the part first.",
    keywords: ["spin", "spinner", "rotate", "rotating", "turn", "propeller", "obby spinner"],
    scriptType: "Script",
    where: "Inside a Part (anchor the part!)",
    code: `-- Put this Script inside an ANCHORED Part to make it spin.
local part = script.Parent
local RunService = game:GetService("RunService")
local SPEED = 90 -- degrees per second

RunService.Heartbeat:Connect(function(deltaTime)
	part.CFrame = part.CFrame * CFrame.Angles(0, math.rad(SPEED * deltaTime), 0)
end)`,
  },
  {
    id: "lava-damage",
    title: "Lava (damage over time)",
    emoji: "🔥",
    description: "A part that keeps hurting players while they stand on it.",
    keywords: ["lava", "damage", "burn", "hurt", "poison", "acid", "damage over time", "fire"],
    scriptType: "Script",
    where: "Inside a Part (in Workspace)",
    code: `-- Put this Script inside a Part. It damages players while they touch it.
local part = script.Parent
local DAMAGE = 10 -- health lost per second

local burning = {}

part.Touched:Connect(function(hit)
	local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
	if humanoid and not burning[humanoid] then
		burning[humanoid] = true
		while burning[humanoid] and humanoid.Health > 0 do
			humanoid:TakeDamage(DAMAGE)
			task.wait(1)
		end
	end
end)

part.TouchEnded:Connect(function(hit)
	local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
	if humanoid then
		burning[humanoid] = nil
	end
end)`,
  },
  {
    id: "coin-pickup",
    title: "Collectable coin",
    emoji: "🪙",
    description: "A coin that adds 1 to the player's Coins leaderboard, then disappears.",
    keywords: ["coin", "collect", "pickup", "collectable", "grab coin", "gem", "reward"],
    scriptType: "Script",
    where: "Inside a coin Part (needs the Coin leaderboard)",
    code: `-- Put this Script inside a coin Part.
-- Needs the "Coin leaderboard" script running too.
local coin = script.Parent
local Players = game:GetService("Players")
local collected = false

coin.Touched:Connect(function(hit)
	if collected then return end
	local player = Players:GetPlayerFromCharacter(hit.Parent)
	if not player then return end

	local leaderstats = player:FindFirstChild("leaderstats")
	local coins = leaderstats and leaderstats:FindFirstChild("Coins")
	if coins then
		collected = true
		coins.Value += 1
		coin:Destroy()
	end
end)`,
  },
  {
    id: "click-button",
    title: "Clickable button",
    emoji: "🖱️",
    description: "A part players can click. Adds a ClickDetector for you.",
    keywords: ["click", "button", "clickdetector", "press", "clickable", "interact"],
    scriptType: "Script",
    where: "Inside a Part (in Workspace)",
    code: `-- Put this Script inside a Part to make it clickable.
local part = script.Parent

local clickDetector = Instance.new("ClickDetector")
clickDetector.Parent = part

clickDetector.MouseClick:Connect(function(player)
	print(player.Name .. " clicked the button!")
	part.Color = Color3.fromRGB(math.random(0, 255), math.random(0, 255), math.random(0, 255))
end)`,
  },
  {
    id: "door-prompt",
    title: "Openable door",
    emoji: "🚪",
    description: "A door players open and close by walking up and pressing E.",
    keywords: ["door", "open", "proximity", "prompt", "gate", "e to open", "openable"],
    scriptType: "Script",
    where: "Inside a door Part (in Workspace)",
    code: `-- Put this Script inside a door Part. Walk up and press E.
local door = script.Parent

local prompt = Instance.new("ProximityPrompt")
prompt.ActionText = "Open"
prompt.KeyboardKeyCode = Enum.KeyCode.E
prompt.Parent = door

local isOpen = false

prompt.Triggered:Connect(function()
	isOpen = not isOpen
	door.CanCollide = not isOpen
	door.Transparency = isOpen and 0.6 or 0
	prompt.ActionText = isOpen and "Close" or "Open"
end)`,
  },
  {
    id: "day-night",
    title: "Day / night cycle",
    emoji: "🌗",
    description: "Slowly moves the sun so the sky cycles between day and night.",
    keywords: ["day", "night", "cycle", "time", "sun", "sky", "lighting", "day night"],
    scriptType: "Script",
    where: "ServerScriptService",
    code: `-- Slowly cycles the time of day.
local Lighting = game:GetService("Lighting")
local GAME_MINUTES_PER_SECOND = 2

while true do
	Lighting.ClockTime = (Lighting.ClockTime + GAME_MINUTES_PER_SECOND / 60) % 24
	task.wait(0.1)
end`,
  },
  {
    id: "double-jump",
    title: "Double jump",
    emoji: "🦘",
    description: "Lets players jump a second time while in the air.",
    keywords: ["double jump", "doublejump", "jump twice", "air jump", "extra jump"],
    scriptType: "LocalScript",
    where: "StarterPlayer > StarterPlayerScripts",
    code: `-- Lets the player jump a second time in mid-air.
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local canDoubleJump = false
local hasDoubleJumped = false

UserInputService.JumpRequest:Connect(function()
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if not humanoid then return end

	if humanoid:GetState() == Enum.HumanoidStateType.Jumping then
		canDoubleJump = true
		hasDoubleJumped = false
	elseif canDoubleJump and not hasDoubleJumped then
		hasDoubleJumped = true
		local root = character:FindFirstChild("HumanoidRootPart")
		if root then
			humanoid:ChangeState(Enum.HumanoidStateType.Jumping)
			root.AssemblyLinearVelocity = Vector3.new(
				root.AssemblyLinearVelocity.X,
				50,
				root.AssemblyLinearVelocity.Z
			)
		end
	end
end)`,
  },
  {
    id: "sprint",
    title: "Sprint (hold Shift)",
    emoji: "🏃",
    description: "Players run faster while holding Left Shift.",
    keywords: ["sprint", "run", "shift", "speed", "fast", "hold shift", "running"],
    scriptType: "LocalScript",
    where: "StarterPlayer > StarterPlayerScripts",
    code: `-- Hold Left Shift to sprint.
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local WALK_SPEED = 16
local SPRINT_SPEED = 28

local function getHumanoid()
	local character = player.Character
	return character and character:FindFirstChildOfClass("Humanoid")
end

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.LeftShift then
		local humanoid = getHumanoid()
		if humanoid then humanoid.WalkSpeed = SPRINT_SPEED end
	end
end)

UserInputService.InputEnded:Connect(function(input)
	if input.KeyCode == Enum.KeyCode.LeftShift then
		local humanoid = getHumanoid()
		if humanoid then humanoid.WalkSpeed = WALK_SPEED end
	end
end)`,
  },
  {
    id: "give-tool",
    title: "Give a tool on join",
    emoji: "🗡️",
    description: "Hands every player a tool (like a sword) each time they spawn.",
    keywords: ["tool", "sword", "give", "weapon", "gear", "backpack", "starter tool"],
    scriptType: "Script",
    where: "ServerScriptService (put your Tool in ServerStorage)",
    code: `-- Gives every player a tool when they spawn.
-- Put a Tool named "Sword" inside ServerStorage first.
local Players = game:GetService("Players")
local ServerStorage = game:GetService("ServerStorage")
local TOOL_NAME = "Sword"

Players.PlayerAdded:Connect(function(player)
	player.CharacterAdded:Connect(function()
		local tool = ServerStorage:FindFirstChild(TOOL_NAME)
		if tool then
			tool:Clone().Parent = player.Backpack
		end
	end)
end)`,
  },
  {
    id: "fall-death",
    title: "Die when you fall off",
    emoji: "🕳️",
    description: "Kills players who fall below a height, so they respawn.",
    keywords: ["fall", "void", "fall off", "out of bounds", "reset", "fall death", "abyss"],
    scriptType: "Script",
    where: "ServerScriptService",
    code: `-- Kills players who fall below FALL_HEIGHT so they respawn.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local FALL_HEIGHT = -50

Players.PlayerAdded:Connect(function(player)
	player.CharacterAdded:Connect(function(character)
		local humanoid = character:WaitForChild("Humanoid")
		local root = character:WaitForChild("HumanoidRootPart")
		local connection
		connection = RunService.Heartbeat:Connect(function()
			if root.Position.Y < FALL_HEIGHT then
				humanoid.Health = 0
				connection:Disconnect()
			end
		end)
	end)
end)`,
  },
  {
    id: "background-music",
    title: "Background music",
    emoji: "🎵",
    description: "Plays a looping song for everyone. Swap in your own audio ID.",
    keywords: ["music", "song", "sound", "audio", "background music", "soundtrack"],
    scriptType: "LocalScript",
    where: "StarterPlayer > StarterPlayerScripts",
    code: `-- Plays looping background music.
local SoundService = game:GetService("SoundService")

local music = Instance.new("Sound")
music.SoundId = "rbxassetid://1837879082" -- replace with your own audio ID
music.Looped = true
music.Volume = 0.5
music.Parent = SoundService
music:Play()`,
  },
  {
    id: "welcome-message",
    title: "Welcome message",
    emoji: "👋",
    description: "Shows a friendly on-screen welcome that fades after a few seconds.",
    keywords: ["welcome", "message", "greeting", "hello", "gui", "join message", "text"],
    scriptType: "LocalScript",
    where: "StarterPlayer > StarterPlayerScripts",
    code: `-- Shows a welcome message when the player joins.
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local gui = Instance.new("ScreenGui")
gui.ResetOnSpawn = false
gui.Parent = playerGui

local label = Instance.new("TextLabel")
label.Size = UDim2.new(1, 0, 0, 60)
label.Position = UDim2.new(0, 0, 0, 20)
label.BackgroundTransparency = 1
label.Text = "Welcome, " .. player.Name .. "!"
label.TextScaled = true
label.TextColor3 = Color3.fromRGB(255, 255, 255)
label.Font = Enum.Font.FredokaOne
label.Parent = gui

task.delay(5, function()
	gui:Destroy()
end)`,
  },
  {
    id: "speed-jump",
    title: "Faster speed & higher jump",
    emoji: "⚡",
    description: "Makes every player run faster and jump higher.",
    keywords: ["walkspeed", "jump power", "jump height", "faster", "higher", "speed jump", "movement"],
    scriptType: "Script",
    where: "ServerScriptService",
    code: `-- Makes players faster and jumpier.
local Players = game:GetService("Players")
local WALK_SPEED = 24
local JUMP_POWER = 60

Players.PlayerAdded:Connect(function(player)
	player.CharacterAdded:Connect(function(character)
		local humanoid = character:WaitForChild("Humanoid")
		humanoid.UseJumpPower = true
		humanoid.WalkSpeed = WALK_SPEED
		humanoid.JumpPower = JUMP_POWER
	end)
end)`,
  },
  {
    id: "round-timer",
    title: "Round countdown timer",
    emoji: "⏱️",
    description: "Counts down each round in the output, then starts a new one.",
    keywords: ["timer", "countdown", "round", "clock", "match", "wave", "round timer"],
    scriptType: "Script",
    where: "ServerScriptService",
    code: `-- Counts down each round, then starts again.
local ROUND_TIME = 30 -- seconds

while true do
	for seconds = ROUND_TIME, 0, -1 do
		print("Time left: " .. seconds)
		task.wait(1)
	end
	print("Round over! Starting a new round...")
	task.wait(2)
end`,
  },
];

/**
 * Where the companion Roblox Studio plugin should drop the generated script.
 * - "ServerScriptService": a Script that runs on the server.
 * - "StarterPlayerScripts": a LocalScript that runs on each player's client.
 * - "WorkspacePart": create a Part in Workspace and nest the script inside it.
 */
export type PlacementTarget = "ServerScriptService" | "StarterPlayerScripts" | "WorkspacePart";

const TARGET_BY_ID: Record<string, PlacementTarget> = {
  leaderstats: "ServerScriptService",
  "kill-brick": "WorkspacePart",
  "heal-brick": "WorkspacePart",
  "teleport-pad": "WorkspacePart",
  "color-on-touch": "WorkspacePart",
  "rainbow-part": "WorkspacePart",
  spinner: "WorkspacePart",
  "lava-damage": "WorkspacePart",
  "coin-pickup": "WorkspacePart",
  "click-button": "WorkspacePart",
  "door-prompt": "WorkspacePart",
  "day-night": "ServerScriptService",
  "double-jump": "StarterPlayerScripts",
  sprint: "StarterPlayerScripts",
  "give-tool": "ServerScriptService",
  "fall-death": "ServerScriptService",
  "background-music": "StarterPlayerScripts",
  "welcome-message": "StarterPlayerScripts",
  "speed-jump": "ServerScriptService",
  "round-timer": "ServerScriptService",
};

/** Machine-readable placement for a template, used by the Studio plugin. */
export function targetFor(id: string): PlacementTarget {
  return TARGET_BY_ID[id] ?? "ServerScriptService";
}

const STOPWORDS = new Set([
  "a", "an", "the", "to", "for", "of", "that", "make", "makes", "making", "made",
  "create", "creates", "creating", "generate", "script", "code", "roblox", "studio",
  "when", "you", "your", "want", "how", "do", "does", "with", "and", "on", "in",
  "it", "my", "me", "please", "give", "get", "some", "can", "will", "be", "is",
  "this", "add", "adds", "using", "use", "game", "part", "player", "players",
]);

/** Break text into lowercase word tokens, dropping noise words. */
export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return matches.filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export interface Match {
  template: RobloxTemplate;
  score: number;
}

/**
 * Rank the library against a free-text request. Returns matches with a score
 * above zero, best first. Ties keep library order (stable) for determinism.
 */
export function matchScripts(query: string): Match[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const queryTokens = new Set(tokenize(q));

  const scored = TEMPLATES.map((template, index) => {
    let score = 0;

    // Whole-phrase keyword hits are the strongest signal.
    for (const keyword of template.keywords) {
      if (keyword.includes(" ") && q.includes(keyword)) {
        score += 5;
      }
    }

    // Token overlap between the request and the template's keywords + title.
    const templateTokens = new Set(
      tokenize(template.keywords.join(" ") + " " + template.title),
    );
    for (const token of queryTokens) {
      if (templateTokens.has(token)) score += 2;
    }

    return { template, score, index };
  });

  return scored
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ template, score }) => ({ template, score }));
}

/** Example prompts shown as clickable chips to get people started. */
export const EXAMPLE_PROMPTS: string[] = [
  "kill brick",
  "coin leaderboard",
  "double jump",
  "sprint when I hold shift",
  "day night cycle",
  "openable door",
  "teleport pad",
  "spinning part",
];
