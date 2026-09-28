/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite comprobar producción sin sobrescribir el directorio del servidor de desarrollo.
  distDir: process.env.CONTROLERP_BUILD_CHECK === '1' ? '.next-build-check' : '.next',
};

export default nextConfig;
