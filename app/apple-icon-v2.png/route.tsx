import { ImageResponse } from "next/og";
import { PwaIcon } from "@/components/layout/pwa-icon";

export function GET() {
  return new ImageResponse(<PwaIcon size={180} />, { width: 180, height: 180 });
}
