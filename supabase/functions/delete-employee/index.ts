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

    // Delete related records first (in order of dependencies)
    // 1. Delete EOD reports
    const { error: eodError } = await supabaseClient
      .from('eod_reports')
      .delete()
      .eq('user_id', employeeId);

    if (eodError) throw eodError;

    // 2. Delete schedules
    const { error: schedulesError } = await supabaseClient
      .from('schedules')
      .delete()
      .eq('user_id', employeeId);

    if (schedulesError) throw schedulesError;

    // 3. Delete payroll records
    const { error: payrollError } = await supabaseClient
      .from('payroll')
      .delete()
      .eq('user_id', employeeId);

    if (payrollError) throw payrollError;

    // 4. Delete attendance records
    const { error: attendanceError } = await supabaseClient
      .from('attendance')
      .delete()
      .eq('user_id', employeeId);

    if (attendanceError) throw attendanceError;

    // 5. Delete user roles
    const { error: rolesError } = await supabaseClient
      .from('user_roles')
      .delete()
      .eq('user_id', employeeId);

    if (rolesError) throw rolesError;

    // 6. Delete profile
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
