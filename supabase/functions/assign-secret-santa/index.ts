import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Participant {
  id: string;
  user_id: string;
}

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Create a valid derangement (no one gets themselves)
function createDerangement(participants: Participant[]): { giver_id: string; receiver_id: string }[] {
  if (participants.length < 3) {
    throw new Error('Need at least 3 participants for Secret Santa');
  }

  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const shuffled = shuffleArray(participants);
    let valid = true;

    // Check if anyone would get themselves
    for (let i = 0; i < participants.length; i++) {
      if (participants[i].user_id === shuffled[i].user_id) {
        valid = false;
        break;
      }
    }

    if (valid) {
      // Create assignments in circular pattern
      return participants.map((giver, index) => ({
        giver_id: giver.user_id,
        receiver_id: shuffled[index].user_id,
      }));
    }

    attempts++;
  }

  throw new Error('Failed to generate valid Secret Santa assignments after multiple attempts');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is an admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      throw new Error('Only admins can generate assignments');
    }

    // Get the event ID from the request
    const { eventId } = await req.json();

    if (!eventId) {
      throw new Error('Event ID is required');
    }

    console.log('Generating assignments for event:', eventId);

    // Get the event and verify it's in 'open' status
    const { data: event, error: eventError } = await supabaseClient
      .from('secret_santa_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    if (event.status !== 'open') {
      throw new Error('Event must be in "open" status to generate assignments');
    }

    // Get all active participants
    const { data: participants, error: participantsError } = await supabaseClient
      .from('secret_santa_participants')
      .select('id, user_id')
      .eq('event_id', eventId)
      .eq('is_active', true);

    if (participantsError) {
      throw participantsError;
    }

    if (!participants || participants.length < 3) {
      throw new Error('Need at least 3 participants for Secret Santa');
    }

    console.log(`Found ${participants.length} participants`);

    // Check if assignments already exist
    const { data: existingAssignments } = await supabaseClient
      .from('secret_santa_assignments')
      .select('id')
      .eq('event_id', eventId)
      .limit(1);

    if (existingAssignments && existingAssignments.length > 0) {
      throw new Error('Assignments already exist for this event');
    }

    // Generate the assignments
    const assignments = createDerangement(participants);

    console.log('Generated assignments:', assignments.length);

    // Insert assignments in a transaction
    const assignmentsToInsert = assignments.map(({ giver_id, receiver_id }) => ({
      event_id: eventId,
      giver_id,
      receiver_id,
    }));

    const { error: insertError } = await supabaseClient
      .from('secret_santa_assignments')
      .insert(assignmentsToInsert);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Update event status to 'assigned' and enable reveal
    const { error: updateError } = await supabaseClient
      .from('secret_santa_events')
      .update({ 
        status: 'assigned',
        reveal_enabled: true 
      })
      .eq('id', eventId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log('Assignments created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Secret Santa assignments generated successfully',
        assignmentsCount: assignments.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
