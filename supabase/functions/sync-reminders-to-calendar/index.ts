import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all announcements that are reminders and don't have calendar events yet
    const { data: announcements, error: announcementsError } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .not('expires_at', 'is', null);

    if (announcementsError) throw announcementsError;

    const eventsToCreate = [];

    for (const announcement of announcements || []) {
      // Check if calendar event already exists for this announcement
      const { data: existingEvent } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('title', announcement.title)
        .eq('event_type', 'reminder')
        .maybeSingle();

      if (!existingEvent && announcement.expires_at) {
        eventsToCreate.push({
          title: announcement.title,
          description: announcement.content,
          event_type: 'reminder',
          start_time: announcement.expires_at,
          end_time: announcement.expires_at,
          all_day: true,
          color: '#f59e0b',
          is_public: true,
          created_by: announcement.created_by,
        });
      }
    }

    if (eventsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert(eventsToCreate);

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${eventsToCreate.length} reminders to calendar` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error syncing reminders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});