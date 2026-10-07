import { ImageResponse } from "next/og";
import { PwaIcon } from "@/components/layout/pwa-icon";

export function GET() {
  return new ImageResponse(<PwaIcon size={192} />, { width: 192, height: 192 });
}
