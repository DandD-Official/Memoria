import { ImageResponse } from "next/og";
import { PwaIcon } from "@/components/layout/pwa-icon";

export function GET() {
  return new ImageResponse(<PwaIcon size={512} />, { width: 512, height: 512 });
}
