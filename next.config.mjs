/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.100.65",
    // opcional, se você usa range local e quer evitar retrabalho:
    "192.168.100.*",
  ],
};

export default nextConfig;
