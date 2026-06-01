import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get the user making the request
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error('Only admins can delete employees');
    }

    const { employeeId } = await req.json();

    if (!employeeId) {
      throw new Error('Employee ID is required');
    }

    // Delete from all tables that reference this user (profiles or auth.users)
    const deleteByUserId: string[] = [
      'eod_reports',
      'schedules',
      'payroll',
      'attendance',
      'user_roles',
      'employee_feedback',
      'announcement_comments',
      'announcement_reactions',
      'notification_acknowledgments',
      'org_chart',
      'employee_achievements',
      'secret_santa_participants',
      'secret_santa_wishlists',
      'calendar_event_responses',
      'admin_permissions',
    ];

    for (const table of deleteByUserId) {
      const { error } = await supabaseClient.from(table).delete().eq('user_id', employeeId);
      if (error) console.error(`Delete ${table} by user_id:`, error.message);
    }

    // Tables with multiple FK columns or different column names
    const multiCol: Array<{ table: string; cols: string[] }> = [
      { table: 'memos', cols: ['sender_id', 'recipient_id'] },
      { table: 'announcements', cols: ['featured_user_id'] },
      { table: 'secret_santa_events', cols: ['created_by'] },
      { table: 'secret_santa_assignments', cols: ['giver_id', 'receiver_id'] },
      { table: 'calendar_events', cols: ['created_by'] },
      { table: 'award_categories', cols: ['created_by'] },
      { table: 'voting_periods', cols: ['winner_id'] },
      { table: 'employee_nominations', cols: ['approved_by'] },
      { table: 'shoutout_requests', cols: ['target_user_id'] },
      { table: 'feedback_requests', cols: ['target_user_id'] },
      { table: 'evaluation_requests', cols: ['target_employee_id'] },
    ];

    for (const { table, cols } of multiCol) {
      for (const col of cols) {
        const { error } = await supabaseClient.from(table).delete().eq(col, employeeId);
        if (error) console.error(`Delete ${table} by ${col}:`, error.message);
      }
    }

    // Null out optional references
    await supabaseClient.from('memos').update({ resolved_by: null }).eq('resolved_by', employeeId);
    await supabaseClient.from('employee_achievements').update({ awarded_by: null }).eq('awarded_by', employeeId);
    await supabaseClient.from('admin_permissions').update({ granted_by: null }).eq('granted_by', employeeId);

    // Delete profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', employeeId);

    if (profileError) throw profileError;

    // 7. Finally, delete the auth user (requires service role)
    const { error: authError } = await supabaseClient.auth.admin.deleteUser(employeeId);

    if (authError) throw authError;

    return new Response(
      JSON.stringify({ success: true, message: 'Employee deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error deleting employee:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
