import { Topbar } from "@/components/simple/topbar"
import { Dashboard } from "@/components/dashboard/dashboard"

export default function DashboardPage() {
  return (
    <>
      <Topbar titulo="Dashboard" />
      <Dashboard />
    </>
  )
}
