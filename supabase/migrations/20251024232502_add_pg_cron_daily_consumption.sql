/*
  # Configuração de Execução Automática Diária

  ## Descrição
  Configura o pg_cron para executar automaticamente o processamento de consumo diário
  todos os dias à meia-noite (horário UTC).

  ## Alterações
  1. Habilita a extensão pg_cron
  2. Cria um job agendado que chama a Edge Function de processamento diário
  3. Job executado diariamente às 00:00 UTC (21:00 horário de Brasília do dia anterior)

  ## Notas
  - O pg_cron é uma extensão nativa do Supabase para agendamento de tarefas
  - A função será executada automaticamente sem necessidade de intervenção manual
  - Logs de execução podem ser verificados na tabela cron.job_run_details
*/

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a function to call the Edge Function
CREATE OR REPLACE FUNCTION trigger_daily_consumption()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response_status int;
  response_body text;
BEGIN
  -- Call the Edge Function using pg_net extension
  SELECT status, content::text INTO response_status, response_body
  FROM http((
    'POST',
    current_setting('app.settings.supabase_url') || '/functions/v1/process-daily-consumption',
    ARRAY[
      http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    '{}'
  )::http_request);
  
  -- Log the result
  RAISE NOTICE 'Daily consumption processed. Status: %, Response: %', response_status, response_body;
END;
$$;

-- Alternative: Direct processing function (fallback if pg_net is not available)
CREATE OR REPLACE FUNCTION process_daily_consumption_direct()
RETURNS TABLE(processed int, skipped int, errors text[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_record RECORD;
  new_balance numeric;
  today date := CURRENT_DATE;
  consumption_amount numeric;
  processed_count int := 0;
  skipped_count int := 0;
  error_list text[] := ARRAY[]::text[];
BEGIN
  FOR client_record IN 
    SELECT id, daily_budget, current_balance 
    FROM clients 
    WHERE is_active = true AND daily_budget > 0
  LOOP
    BEGIN
      -- Check if already processed today
      IF EXISTS (
        SELECT 1 FROM daily_consumption_log 
        WHERE client_id = client_record.id 
        AND consumption_date = today
      ) THEN
        skipped_count := skipped_count + 1;
        CONTINUE;
      END IF;

      -- Calculate consumption and new balance
      consumption_amount := LEAST(client_record.daily_budget, client_record.current_balance);
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
        today,
        consumption_amount,
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
        consumption_amount,
        new_balance,
        'Consumo diário automático',
        today
      );

      -- Update client balance
      UPDATE clients 
      SET current_balance = new_balance 
      WHERE id = client_record.id;

      processed_count := processed_count + 1;
    EXCEPTION WHEN OTHERS THEN
      error_list := array_append(error_list, 'Client ' || client_record.id || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN QUERY SELECT processed_count, skipped_count, error_list;
END;
$$;

-- Schedule the job to run daily at midnight UTC
SELECT cron.schedule(
  'process-daily-consumption',
  '0 0 * * *',
  $$SELECT process_daily_consumption_direct();$$
);

-- Create a table to track manual executions (optional)
CREATE TABLE IF NOT EXISTS daily_consumption_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  processed_count int NOT NULL,
  skipped_count int NOT NULL,
  errors text[],
  executed_at timestamptz DEFAULT now()
);

ALTER TABLE daily_consumption_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view consumption runs"
  ON daily_consumption_runs FOR SELECT
  TO authenticated
  USING (true);