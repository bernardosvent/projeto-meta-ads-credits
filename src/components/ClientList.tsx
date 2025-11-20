import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
import type { Client } from './Dashboard';

interface ClientListProps {
  clients: Client[];
  onSelect: (client: Client) => void;
  selectedId?: string;
}

export function ClientList({ clients, onSelect, selectedId }: ClientListProps) {
  if (clients.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p>Nenhum cliente encontrado</p>
      </div>
    );
  }

  const calculateDaysRemaining = (balance: number, dailyBudget: number) => {
    if (dailyBudget <= 0) return null;
    return Math.floor(balance / dailyBudget);
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      weekly: 'Semanal',
      biweekly: 'Quinzenal',
      monthly: 'Mensal',
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      boleto: 'Boleto',
      pix: 'PIX',
    };
    return labels[method as keyof typeof labels] || method;
  };

  return (
    <div className="divide-y divide-slate-200">
      {clients.map((client) => {
        const daysRemaining = calculateDaysRemaining(client.current_balance, client.daily_budget);
        const isLowBalance = client.current_balance < client.alert_threshold;
        const balancePercentage = client.daily_budget > 0
          ? Math.min(100, (client.current_balance / (client.daily_budget * 30)) * 100)
          : 0;

        return (
          <button
            key={client.id}
            onClick={() => onSelect(client)}
            className={`w-full p-6 hover:bg-slate-50 transition text-left ${
              selectedId === client.id ? 'bg-slate-50' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-slate-900 truncate">
                    {client.name}
                  </h3>
                  {!client.is_active && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                      Inativo
                    </span>
                  )}
                  {isLowBalance && client.is_active && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                      <AlertCircle className="w-3 h-3" />
                      Saldo Baixo
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Saldo Atual</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {client.current_balance.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">Orçamento Diário</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {client.daily_budget.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">Dias Restantes</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {daysRemaining !== null ? `~${daysRemaining} dias` : 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">Pagamento</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {getPaymentMethodLabel(client.payment_method)} • {getFrequencyLabel(client.payment_frequency)}
                    </p>
                  </div>
                </div>

                <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full transition-all ${
                      isLowBalance ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${balancePercentage}%` }}
                  />
                </div>
              </div>

              <div className="flex-shrink-0">
                {client.current_balance > client.daily_budget * 7 ? (
                  <TrendingUp className="w-6 h-6 text-green-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
