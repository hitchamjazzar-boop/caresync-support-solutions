import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Memo {
  id: string;
  title: string;
  content: string;
  type: 'memo' | 'reminder' | 'warning';
  recipient_id: string;
  sender_id: string;
  created_at: string;
  escalate_after_hours: number;
  recipient_profile?: {
    full_name: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting memo escalation check...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate the cutoff time for escalation
    const now = new Date();
    
    // Find unread, non-escalated memos that are past their escalation time
    const { data: memosToEscalate, error: fetchError } = await supabaseClient
      .from('memos')
      .select('*, recipient_profile:profiles!recipient_id(full_name)')
      .eq('is_read', false)
      .eq('escalated', false)
      .not('escalate_after_hours', 'is', null)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching memos:', fetchError);
      throw fetchError;
    }

    if (!memosToEscalate || memosToEscalate.length === 0) {
      console.log('No memos need escalation at this time');
      return new Response(
        JSON.stringify({ 
          success: true, 
          escalated: 0,
          message: 'No memos need escalation' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Filter memos that are past their escalation time
    const memosNeedingEscalation = memosToEscalate.filter((memo: Memo) => {
      const createdAt = new Date(memo.created_at);
      const escalateAfterMs = memo.escalate_after_hours * 60 * 60 * 1000;
      const escalateTime = new Date(createdAt.getTime() + escalateAfterMs);
      return now >= escalateTime;
    });

    console.log(`Found ${memosNeedingEscalation.length} memos to escalate`);

    let escalatedCount = 0;
    const errors: string[] = [];

    // Process each memo that needs escalation
    for (const memo of memosNeedingEscalation) {
      try {
        const recipientName = memo.recipient_profile?.full_name || 'Unknown';
        
        // Create an escalation reminder memo
        const { data: escalationMemo, error: insertError } = await supabaseClient
          .from('memos')
          .insert({
            sender_id: memo.sender_id,
            recipient_id: memo.recipient_id,
            type: 'reminder',
            title: `REMINDER: ${memo.title}`,
            content: `This is an automated reminder regarding the following unread ${memo.type}:\n\n"${memo.title}"\n\nOriginal message:\n${memo.content}\n\n⏰ This ${memo.type} was sent ${memo.escalate_after_hours} hours ago and requires your attention.`,
            expires_at: null,
            escalate_after_hours: null, // Don't escalate the escalation
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Error creating escalation memo for ${memo.id}:`, insertError);
          errors.push(`Failed to escalate memo ${memo.id}: ${insertError.message}`);
          continue;
        }

        // Mark the original memo as escalated
        const { error: updateError } = await supabaseClient
          .from('memos')
          .update({
            escalated: true,
            escalated_at: now.toISOString(),
            escalation_memo_id: escalationMemo.id,
          })
          .eq('id', memo.id);

        if (updateError) {
          console.error(`Error updating memo ${memo.id}:`, updateError);
          errors.push(`Failed to mark memo ${memo.id} as escalated: ${updateError.message}`);
          continue;
        }

        escalatedCount++;
        console.log(`Successfully escalated memo ${memo.id} for ${recipientName}`);
      } catch (error: any) {
        console.error(`Error processing memo ${memo.id}:`, error);
        errors.push(`Error processing memo ${memo.id}: ${error.message}`);
      }
    }

    const result = {
      success: true,
      escalated: escalatedCount,
      total_checked: memosToEscalate.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString(),
    };

    console.log('Escalation check completed:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error('Error in escalate-memos function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
