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

    console.log('Starting birthday sync to calendar...');

    // Get all profiles with birthdays
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, birthday')
      .not('birthday', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} profiles with birthdays`);

    const eventsToCreate = [];
    const currentYear = new Date().getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const profile of profiles || []) {
      const birthday = new Date(profile.birthday);
      const birthdayThisYear = new Date(currentYear, birthday.getMonth(), birthday.getDate());
      
      // If birthday has passed this year, create for next year
      const birthdayDate = birthdayThisYear < today 
        ? new Date(currentYear + 1, birthday.getMonth(), birthday.getDate())
        : birthdayThisYear;

      // Check if calendar event already exists for this birthday this year
      const { data: existingEvent } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('event_type', 'birthday')
        .ilike('title', `%${profile.full_name}%Birthday%`)
        .gte('start_time', `${birthdayDate.getFullYear()}-01-01`)
        .lte('start_time', `${birthdayDate.getFullYear()}-12-31`)
        .maybeSingle();

      if (!existingEvent) {
        console.log(`Creating birthday event for ${profile.full_name}`);
        eventsToCreate.push({
          title: `🎂 ${profile.full_name}'s Birthday`,
          description: `Join us in celebrating ${profile.full_name}'s special day!`,
          event_type: 'birthday',
          start_time: birthdayDate.toISOString(),
          end_time: birthdayDate.toISOString(),
          all_day: true,
          color: '#ec4899',
          is_public: true,
          created_by: profile.id,
        });
      } else {
        console.log(`Birthday event already exists for ${profile.full_name}`);
      }
    }

    if (eventsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert(eventsToCreate);

      if (insertError) {
        console.error('Error inserting events:', insertError);
        throw insertError;
      }
    }

    console.log(`Successfully synced ${eventsToCreate.length} birthday events`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${eventsToCreate.length} birthday events to calendar`,
        created: eventsToCreate.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error syncing birthdays:', error);
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
