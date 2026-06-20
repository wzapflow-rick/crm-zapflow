import { Topbar } from "@/components/crm/topbar"
import { Overview } from "@/components/crm/overview"

export default function HomePage() {
  return (
    <>
      <Topbar titulo="Visão geral" />
      <Overview />
    </>
  )
}
