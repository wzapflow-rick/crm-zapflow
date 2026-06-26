import { Wallet } from "lucide-react"
import { EmBreve } from "@/components/simple/em-breve"

export default function FinanceiroPage() {
  return (
    <EmBreve
      titulo="Financeiro"
      icon={Wallet}
      descricao="Controle da empresa: receita mensal, receita por cliente, lucro, custos, meta e projeção, com status de pagamento e recorrência."
    />
  )
}
