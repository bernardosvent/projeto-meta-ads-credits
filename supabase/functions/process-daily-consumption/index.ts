import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, daily_budget, current_balance')
      .eq('is_active', true)
      .gt('daily_budget', 0);

    if (clientsError) {
      throw clientsError;
    }

    const results = {
      processed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const client of clients || []) {
      try {
        const { data: existingLog } = await supabase
          .from('daily_consumption_log')
          .select('id')
          .eq('client_id', client.id)
          .eq('consumption_date', today)
          .maybeSingle();

        if (existingLog) {
          results.skipped++;
          continue;
        }

        const consumptionAmount = Math.min(client.daily_budget, client.current_balance);
        const newBalance = Math.max(0, client.current_balance - client.daily_budget);

        const { error: logError } = await supabase
          .from('daily_consumption_log')
          .insert({
            client_id: client.id,
            consumption_date: today,
            amount: consumptionAmount,
            balance_before: client.current_balance,
            balance_after: newBalance,
          });

        if (logError) throw logError;

        const { error: transactionError } = await supabase
          .from('credit_transactions')
          .insert({
            client_id: client.id,
            transaction_type: 'daily_consumption',
            amount: consumptionAmount,
            balance_after: newBalance,
            description: 'Consumo diário automático',
            transaction_date: today,
          });

        if (transactionError) throw transactionError;

        const { error: updateError } = await supabase
          .from('clients')
          .update({ current_balance: newBalance })
          .eq('id', client.id);

        if (updateError) throw updateError;

        results.processed++;
      } catch (error: any) {
        results.errors.push(`Client ${client.id}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error processing daily consumption:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});