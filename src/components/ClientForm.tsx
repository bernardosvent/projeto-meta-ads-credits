import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Client } from './Dashboard';

interface ClientFormProps {
  client?: Client | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ClientForm({ client, onClose, onSaved }: ClientFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    payment_method: 'pix' as 'pix' | 'boleto',
    payment_frequency: 'monthly' as 'weekly' | 'biweekly' | 'monthly',
    daily_budget: '',
    current_balance: '',
    alert_threshold: '100',
    is_active: true,
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        phone: client.phone || '',
        payment_method: client.payment_method,
        payment_frequency: client.payment_frequency,
        daily_budget: client.daily_budget.toString(),
        current_balance: client.current_balance.toString(),
        alert_threshold: client.alert_threshold.toString(),
        is_active: client.is_active,
      });
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        name: formData.name,
        phone: formData.phone || null,
        payment_method: formData.payment_method,
        payment_frequency: formData.payment_frequency,
        daily_budget: parseFloat(formData.daily_budget),
        current_balance: parseFloat(formData.current_balance),
        alert_threshold: parseFloat(formData.alert_threshold),
        is_active: formData.is_active,
        manager_id: user!.id,
      };

      if (client) {
        const { error } = await supabase
          .from('clients')
          .update(data)
          .eq('id', client.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(data);

        if (error) throw error;
      }

      onSaved();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Erro ao salvar cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome do Cliente *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Telefone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Forma de Pagamento *
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              >
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Recorrência *
              </label>
              <select
                value={formData.payment_frequency}
                onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value as any })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              >
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quinzenal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Orçamento Diário (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.daily_budget}
                onChange={(e) => setFormData({ ...formData, daily_budget: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Saldo Atual (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.current_balance}
                onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Limite de Alerta de Saldo (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.alert_threshold}
              onChange={(e) => setFormData({ ...formData, alert_threshold: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              required
            />
            <p className="text-sm text-slate-500 mt-1">
              Você será alertado quando o saldo do cliente ficar abaixo deste valor
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Cliente Ativo
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
