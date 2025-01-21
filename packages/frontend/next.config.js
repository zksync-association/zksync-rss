/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Required for static export
  },
  // Since we're fetching from a public URL, we don't need to configure additional domains
}

module.exports = nextConfig 