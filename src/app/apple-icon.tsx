import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffd84d",
          color: "#2b2e4a",
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        A
      </div>
    ),
    { ...size }
  );
}
