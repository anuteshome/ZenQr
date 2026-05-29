import type { NextConfig } from "next";
import os from "node:os";

/** LAN IPs so phones on Wi‑Fi can load /_next/* in dev (Next.js blocks unknown origins by default). */
function getLocalIPv4Addresses(): string[] {
  const ips = new Set<string>();
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const iface of interfaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.add(iface.address);
      }
    }
  }
  return [...ips];
}

const extraDevOrigins = process.env.ALLOWED_DEV_ORIGIN
  ? process.env.ALLOWED_DEV_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

const nextConfig: NextConfig = {
  allowedDevOrigins: [...getLocalIPv4Addresses(), ...extraDevOrigins],
};

export default nextConfig;
