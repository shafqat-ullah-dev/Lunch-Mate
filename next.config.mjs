/** @type {import('next').NextConfig} */
const nextConfig = {
  // All type errors are fixed; keep build honest so regressions fail CI/build.
  images: {
    // All images are local assets in /public, so optimization is safe.
    formats: ["image/avif", "image/webp"],
  },
}

export default nextConfig
