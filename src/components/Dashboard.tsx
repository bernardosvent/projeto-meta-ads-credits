import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ClientList } from './ClientList';
import { ClientForm } from './ClientForm';
import { ClientDetails } from './ClientDetails';
import { LogOut, Plus, TrendingUp, Users, AlertCircle, DollarSign, RefreshCw } from 'lucide-react';

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  payment_method: 'boleto' | 'pix';
  payment_frequency: 'weekly' | 'biweekly' | 'monthly';
  daily_budget: number;
  current_balance: number;
  alert_threshold: number;
  is_active: boolean;
  created_at: string;
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'low_balance'>('all');
  const [processingConsumption, setProcessingConsumption] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSaved = () => {
    loadClients();
    setShowForm(false);
    setEditingClient(null);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
    setSelectedClient(null);
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      loadClients();
      setSelectedClient(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Erro ao excluir cliente');
    }
  };

  const handleProcessDailyConsumption = async () => {
    if (!confirm('Deseja processar o consumo diário de todos os clientes ativos agora?')) return;

    setProcessingConsumption(true);
    try {
      const { data, error } = await supabase.rpc('process_daily_consumption_direct');

      if (error) throw error;

      const result = data[0];
      alert(`Processamento concluído!\n\nProcessados: ${result.processed}\nIgnorados (já processados): ${result.skipped}${result.errors?.length > 0 ? `\nErros: ${result.errors.join(', ')}` : ''}`);

      loadClients();
    } catch (error: any) {
      console.error('Error processing consumption:', error);
      alert('Erro ao processar consumo diário: ' + error.message);
    } finally {
      setProcessingConsumption(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'active') {
      return matchesSearch && client.is_active;
    } else if (filterStatus === 'low_balance') {
      return matchesSearch && client.current_balance < client.alert_threshold;
    }

    return matchesSearch;
  });

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.is_active).length,
    lowBalance: clients.filter(c => c.current_balance < c.alert_threshold).length,
    totalBalance: clients.reduce((sum, c) => sum + c.current_balance, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-2 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Meta Ads Manager</h1>
                <p className="text-sm text-slate-600">Bem-vindo, {user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleProcessDailyConsumption}
                disabled={processingConsumption}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Processar consumo diário manualmente"
              >
                <RefreshCw className={`w-4 h-4 ${processingConsumption ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {processingConsumption ? 'Processando...' : 'Processar Consumo'}
                </span>
              </button>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-slate-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-slate-700" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-sm text-slate-600">Total de Clientes</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-green-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-green-700" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
            <p className="text-sm text-slate-600">Clientes Ativos</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-700" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.lowBalance}</p>
            <p className="text-sm text-slate-600">Saldo Baixo</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-slate-100 p-2 rounded-lg">
                <DollarSign className="w-5 h-5 text-slate-700" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {stats.totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-sm text-slate-600">Saldo Total</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900">Clientes</h2>
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingClient(null);
                  setSelectedClient(null);
                }}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
              >
                <Plus className="w-4 h-4" />
                Novo Cliente
              </button>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="low_balance">Saldo Baixo</option>
              </select>
            </div>
          </div>

          <ClientList
            clients={filteredClients}
            onSelect={setSelectedClient}
            selectedId={selectedClient?.id}
          />
        </div>
      </main>

      {showForm && (
        <ClientForm
          client={editingClient}
          onClose={() => {
            setShowForm(false);
            setEditingClient(null);
          }}
          onSaved={handleClientSaved}
        />
      )}

      {selectedClient && !showForm && (
        <ClientDetails
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdated={loadClients}
        />
      )}
    </div>
  );
}
