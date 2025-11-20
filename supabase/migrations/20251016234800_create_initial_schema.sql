/*
  # Sistema de Controle de Créditos de Meta Ads - Schema Inicial

  ## Descrição
  Este migration cria a estrutura completa do banco de dados para o sistema de gerenciamento
  de créditos de Meta Ads para gestores de tráfego.

  ## Tabelas Criadas

  ### 1. profiles
  Extensão da tabela auth.users com informações adicionais do gestor:
  - `id` (uuid, FK para auth.users)
  - `full_name` (text) - Nome completo do gestor
  - `created_at` (timestamptz) - Data de criação
  - `updated_at` (timestamptz) - Data de atualização

  ### 2. clients
  Armazena os clientes gerenciados:
  - `id` (uuid, PK) - Identificador único
  - `manager_id` (uuid, FK para profiles) - Gestor responsável
  - `name` (text) - Nome do cliente
  - `phone` (text) - Telefone de contato
  - `payment_method` (enum) - Forma de pagamento (boleto/pix)
  - `payment_frequency` (enum) - Recorrência (semanal/quinzenal/mensal)
  - `daily_budget` (numeric) - Orçamento diário em R$
  - `current_balance` (numeric) - Saldo atual disponível
  - `alert_threshold` (numeric) - Valor para alerta de saldo baixo (padrão: 100)
  - `is_active` (boolean) - Status do cliente
  - `created_at` (timestamptz) - Data de criação
  - `updated_at` (timestamptz) - Data de atualização

  ### 3. credit_transactions
  Registra todas as transações de crédito:
  - `id` (uuid, PK) - Identificador único
  - `client_id` (uuid, FK para clients) - Cliente relacionado
  - `transaction_type` (enum) - Tipo: 'credit_added' ou 'daily_consumption'
  - `amount` (numeric) - Valor da transação
  - `balance_after` (numeric) - Saldo após a transação
  - `description` (text) - Descrição opcional
  - `transaction_date` (date) - Data da transação
  - `created_at` (timestamptz) - Timestamp de criação
  - `created_by` (uuid, FK para profiles) - Quem registrou

  ### 4. daily_consumption_log
  Log de consumo diário automático:
  - `id` (uuid, PK) - Identificador único
  - `client_id` (uuid, FK para clients) - Cliente relacionado
  - `consumption_date` (date) - Data do consumo
  - `amount` (numeric) - Valor consumido
  - `balance_before` (numeric) - Saldo antes
  - `balance_after` (numeric) - Saldo depois
  - `processed_at` (timestamptz) - Quando foi processado

  ## Segurança (RLS)
  - Todas as tabelas têm RLS habilitado
  - Gestores só podem acessar seus próprios dados e clientes
  - Políticas separadas para SELECT, INSERT, UPDATE, DELETE

  ## Funções
  - `handle_updated_at()` - Trigger para atualizar updated_at automaticamente
  - `calculate_days_until_depleted()` - Calcula dias até esgotamento do saldo
  - `process_daily_consumption()` - Processa consumo diário de todos os clientes ativos
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM ('boleto', 'pix');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_frequency_type AS ENUM ('weekly', 'biweekly', 'monthly');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('credit_added', 'daily_consumption');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  payment_method payment_method_type NOT NULL DEFAULT 'pix',
  payment_frequency payment_frequency_type NOT NULL DEFAULT 'monthly',
  daily_budget numeric(10, 2) NOT NULL CHECK (daily_budget >= 0),
  current_balance numeric(10, 2) NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  alert_threshold numeric(10, 2) DEFAULT 100 CHECK (alert_threshold >= 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

CREATE POLICY "Managers can insert own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Managers can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Managers can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (manager_id = auth.uid());

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  transaction_type transaction_type NOT NULL,
  amount numeric(10, 2) NOT NULL,
  balance_after numeric(10, 2) NOT NULL,
  description text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view own client transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = credit_transactions.client_id
      AND clients.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can insert transactions for own clients"
  ON credit_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = credit_transactions.client_id
      AND clients.manager_id = auth.uid()
    )
  );

-- Create daily_consumption_log table
CREATE TABLE IF NOT EXISTS daily_consumption_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  consumption_date date NOT NULL,
  amount numeric(10, 2) NOT NULL,
  balance_before numeric(10, 2) NOT NULL,
  balance_after numeric(10, 2) NOT NULL,
  processed_at timestamptz DEFAULT now(),
  UNIQUE(client_id, consumption_date)
);

ALTER TABLE daily_consumption_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view own client consumption logs"
  ON daily_consumption_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = daily_consumption_log.client_id
      AND clients.manager_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DO $$ BEGIN
  DROP TRIGGER IF EXISTS set_updated_at ON profiles;
  CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS set_updated_at ON clients;
  CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create function to calculate days until balance depleted
CREATE OR REPLACE FUNCTION calculate_days_until_depleted(
  p_current_balance numeric,
  p_daily_budget numeric
)
RETURNS integer AS $$
BEGIN
  IF p_daily_budget <= 0 THEN
    RETURN NULL;
  END IF;
  RETURN FLOOR(p_current_balance / p_daily_budget)::integer;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to process daily consumption
CREATE OR REPLACE FUNCTION process_daily_consumption()
RETURNS void AS $$
DECLARE
  client_record RECORD;
  new_balance numeric;
BEGIN
  FOR client_record IN 
    SELECT id, daily_budget, current_balance 
    FROM clients 
    WHERE is_active = true AND daily_budget > 0
  LOOP
    -- Skip if already processed today
    IF EXISTS (
      SELECT 1 FROM daily_consumption_log 
      WHERE client_id = client_record.id 
      AND consumption_date = CURRENT_DATE
    ) THEN
      CONTINUE;
    END IF;

    -- Calculate new balance
    new_balance := GREATEST(0, client_record.current_balance - client_record.daily_budget);

    -- Insert consumption log
    INSERT INTO daily_consumption_log (
      client_id,
      consumption_date,
      amount,
      balance_before,
      balance_after
    ) VALUES (
      client_record.id,
      CURRENT_DATE,
      LEAST(client_record.daily_budget, client_record.current_balance),
      client_record.current_balance,
      new_balance
    );

    -- Insert transaction record
    INSERT INTO credit_transactions (
      client_id,
      transaction_type,
      amount,
      balance_after,
      description,
      transaction_date
    ) VALUES (
      client_record.id,
      'daily_consumption',
      LEAST(client_record.daily_budget, client_record.current_balance),
      new_balance,
      'Consumo diário automático',
      CURRENT_DATE
    );

    -- Update client balance
    UPDATE clients 
    SET current_balance = new_balance 
    WHERE id = client_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_manager_id ON clients(manager_id);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_client_id ON credit_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_date ON credit_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_daily_consumption_client_id ON daily_consumption_log(client_id);
CREATE INDEX IF NOT EXISTS idx_daily_consumption_date ON daily_consumption_log(consumption_date);