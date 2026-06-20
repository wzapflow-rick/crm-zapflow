/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // `pg` usa require dinâmico + binding nativo opcional; precisa rodar como
  // pacote externo do servidor para não quebrar no build de produção.
  serverExternalPackages: ["pg"],
}

export default nextConfig
