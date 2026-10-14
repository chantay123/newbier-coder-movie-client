import type { NextConfig } from "next";

/**
 * Allowed image origins for `next/image`.
 * The home page uses raw <img> tags (so these don't apply there) but
 * admin / profile / search pages use `next/image` and rely on this
 * allowlist to load remote posters / backdrops.
 */
const allowedImageHosts = [
  { protocol: "https" as const, hostname: "core-movie-service.onrender.com" },
  { protocol: "https" as const, hostname: "image.tmdb.org" },
  { protocol: "https" as const, hostname: "res.cloudinary.com" },
  { protocol: "https" as const, hostname: "lh3.googleusercontent.com" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: allowedImageHosts.map(({ protocol, hostname }) => ({
      protocol,
      hostname,
      pathname: "/**",
    })),
  },
};

export default nextConfig;
