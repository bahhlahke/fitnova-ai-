/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/coach",
        destination: "/?focus=ai",
        permanent: true,
      },
      {
        source: "/omni",
        destination: "/?focus=ai",
        permanent: true,
      },
      {
        source: "/log",
        destination: "/log/workout",
        permanent: true,
      },
      {
        source: "/coach/motion-lab",
        destination: "/motion",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
