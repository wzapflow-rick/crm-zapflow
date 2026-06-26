import type { ReactNode } from "react"
import { Providers } from "@/components/simple/providers"
import { Sidebar } from "@/components/simple/sidebar"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </Providers>
  )
}
