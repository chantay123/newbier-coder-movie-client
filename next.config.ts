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

/**
 * @section Route aliasing
 *
 * All client-facing pages now live under `src/pages/client/*` so that
 * Admin / Auth / Api / Common stay cleanly separated at the filesystem
 * level. To keep public URLs stable (e.g. `/browse/movies`, `/movie/[slug]`,
 * `/profile`, `/search`, `/user/profile`...) we use Next.js `rewrites()`
 * to map the legacy public path to the new internal one transparently —
 * the user-facing URL never changes, the underlying page file does.
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: allowedImageHosts.map(({ protocol, hostname }) => ({
      protocol,
      hostname,
      pathname: "/**",
    })),
  },
  async rewrites() {
    return [
      // Homepage: physical file is at /client (src/pages/client/index.tsx).
      { source: "/", destination: "/client" },
      // Browse
      { source: "/browse/:path*", destination: "/client/browse/:path*" },
      // Country / Genre (dynamic slug)
      { source: "/country/:slug", destination: "/client/country/:slug" },
      { source: "/genre/:slug", destination: "/client/genre/:slug" },
      // Movie: detail + nested watch
      { source: "/movie/:path*", destination: "/client/movie/:path*" },
      // Performer
      { source: "/performer", destination: "/client/performer" },
      { source: "/performer/:id", destination: "/client/performer/:id" },
      // Profile / Rankings
      { source: "/profile", destination: "/client/profile" },
      { source: "/rankings", destination: "/client/rankings" },
      // Search
      { source: "/search", destination: "/client/search" },
      { source: "/search/history", destination: "/client/search/history" },
      // User
      { source: "/user/favorites", destination: "/client/user/favorites" },
      { source: "/user/history", destination: "/client/user/history" },
      { source: "/user/premium", destination: "/client/user/premium" },
      { source: "/user/profile", destination: "/client/user/profile" },
      { source: "/user/watch-later", destination: "/client/user/watch-later" },
    ];
  },
};

export default nextConfig;
