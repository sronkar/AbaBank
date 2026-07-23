import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";
import { RobloxGenerator } from "./generator";

export const metadata: Metadata = {
  title: "Roblox Code Generator",
  description: "Type what you want and get ready-to-paste Roblox Studio scripts.",
};

export default function RobloxPage() {
  return (
    <div>
      <PageTitle
        emoji="🎮"
        title="Roblox Code Generator"
        sub="Type the script you want — get working Luau you can drop straight into Roblox Studio."
      />
      <RobloxGenerator />
    </div>
  );
}
