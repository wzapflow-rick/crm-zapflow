/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'pg' usa módulos nativos do Node (dns, fs, net, tls). Mantê-lo externo
  // evita que o bundler tente empacotá-lo e quebre o build de produção.
  serverExternalPackages: ["pg"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
