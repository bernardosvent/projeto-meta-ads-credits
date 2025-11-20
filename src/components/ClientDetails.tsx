import { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Plus, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Client } from './Dashboard';

interface ClientDetailsProps {
  client: Client;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  onUpdated: () => void;
}

interface Transaction {
  id: string;
  transaction_type: 'credit_added' | 'daily_consumption';
  amount: number;
  balance_after: number;
  description: string | null;
  transaction_date: string;
  created_at: string;
}

export function ClientDetails({ client, onClose, onEdit, onDelete, onUpdated }: ClientDetailsProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCredit, setShowAddCredit] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [addingCredit, setAddingCredit] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [client.id]);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('client_id', client.id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCredit(true);

    try {
      const amount = parseFloat(creditAmount);
      const newBalance = client.current_balance + amount;

      const { error: updateError } = await supabase
        .from('clients')
        .update({ current_balance: newBalance })
        .eq('id', client.id);

      if (updateError) throw updateError;

      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          client_id: client.id,
          transaction_type: 'credit_added',
          amount,
          balance_after: newBalance,
          description: creditDescription || 'Crédito adicionado manualmente',
          created_by: user!.id,
        });

      if (transactionError) throw transactionError;

      setCreditAmount('');
      setCreditDescription('');
      setShowAddCredit(false);
      loadTransactions();
      onUpdated();
    } catch (error) {
      console.error('Error adding credit:', error);
      alert('Erro ao adicionar crédito');
    } finally {
      setAddingCredit(false);
    }
  };

  const daysRemaining = client.daily_budget > 0
    ? Math.floor(client.current_balance / client.daily_budget)
    : null;

  const getTransactionIcon = (type: string) => {
    return type === 'credit_added' ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    );
  };

  const getTransactionLabel = (type: string) => {
    return type === 'credit_added' ? 'Crédito Adicionado' : 'Consumo Diário';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">{client.name}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onEdit(client)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </button>
            <button
              onClick={() => setShowAddCredit(!showAddCredit)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Crédito
            </button>
            <button
              onClick={() => onDelete(client.id)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>

        <div className="p-6">
          {showAddCredit && (
            <form onSubmit={handleAddCredit} className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-4">Adicionar Crédito</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descrição (Opcional)
                  </label>
                  <input
                    type="text"
                    value={creditDescription}
                    onChange={(e) => setCreditDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                    placeholder="Ex: Pagamento via PIX - Janeiro"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCredit(false);
                      setCreditAmount('');
                      setCreditDescription('');
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={addingCredit}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {addingCredit ? 'Adicionando...' : 'Adicionar'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Saldo Atual</p>
              <p className="text-2xl font-bold text-slate-900">
                {client.current_balance.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Orçamento Diário</p>
              <p className="text-2xl font-bold text-slate-900">
                {client.daily_budget.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Dias Restantes</p>
              <p className="text-2xl font-bold text-slate-900">
                {daysRemaining !== null ? `~${daysRemaining} dias` : 'N/A'}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Informações do Cliente</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Telefone:</span>
                <span className="font-medium text-slate-900">{client.phone || 'Não informado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Forma de Pagamento:</span>
                <span className="font-medium text-slate-900">
                  {client.payment_method === 'pix' ? 'PIX' : 'Boleto'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Recorrência:</span>
                <span className="font-medium text-slate-900">
                  {client.payment_frequency === 'weekly' ? 'Semanal' :
                   client.payment_frequency === 'biweekly' ? 'Quinzenal' : 'Mensal'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Status:</span>
                <span className={`font-medium ${client.is_active ? 'text-green-600' : 'text-red-600'}`}>
                  {client.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Histórico de Transações</h3>
            {loading ? (
              <div className="text-center py-8 text-slate-500">Carregando...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">Nenhuma transação encontrada</div>
            ) : (
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.transaction_type)}
                      <div>
                        <p className="font-medium text-slate-900">
                          {getTransactionLabel(transaction.transaction_type)}
                        </p>
                        {transaction.description && (
                          <p className="text-sm text-slate-600">{transaction.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <p className="text-xs text-slate-500">
                            {new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        transaction.transaction_type === 'credit_added'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'credit_added' ? '+' : '-'}
                        {transaction.amount.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </p>
                      <p className="text-sm text-slate-500">
                        Saldo: {transaction.balance_after.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
