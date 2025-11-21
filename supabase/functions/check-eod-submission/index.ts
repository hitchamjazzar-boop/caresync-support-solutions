import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Employee {
  id: string;
  full_name: string;
}

interface Attendance {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting EOD submission check...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get today's date range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    console.log(`Checking EOD submissions for ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);

    // Get all attendance records for today
    const { data: attendanceRecords, error: attendanceError } = await supabaseClient
      .from('attendance')
      .select('id, user_id, clock_in, clock_out')
      .gte('clock_in', todayStart.toISOString())
      .lte('clock_in', todayEnd.toISOString());

    if (attendanceError) {
      console.error('Error fetching attendance records:', attendanceError);
      throw attendanceError;
    }

    if (!attendanceRecords || attendanceRecords.length === 0) {
      console.log('No attendance records found for today');
      return new Response(
        JSON.stringify({ 
          success: true, 
          reminders_sent: 0,
          message: 'No attendance records found for today'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log(`Found ${attendanceRecords.length} attendance records for today`);

    // Get all EOD reports submitted today
    const { data: eodReports, error: eodError } = await supabaseClient
      .from('eod_reports')
      .select('user_id, attendance_id')
      .gte('submitted_at', todayStart.toISOString())
      .lte('submitted_at', todayEnd.toISOString());

    if (eodError) {
      console.error('Error fetching EOD reports:', eodError);
      throw eodError;
    }

    // Create a set of user IDs who have submitted EOD reports
    const submittedUserIds = new Set(eodReports?.map(report => report.user_id) || []);

    // Find users who haven't submitted EOD reports
    const usersWithoutEOD = attendanceRecords.filter(
      (attendance: Attendance) => !submittedUserIds.has(attendance.user_id)
    );

    console.log(`Found ${usersWithoutEOD.length} employees who haven't submitted EOD reports`);

    if (usersWithoutEOD.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          reminders_sent: 0,
          message: 'All employees have submitted their EOD reports'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Get admin user ID to send reminders from
    const { data: adminUsers, error: adminError } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1);

    if (adminError || !adminUsers || adminUsers.length === 0) {
      console.error('Error fetching admin user:', adminError);
      throw new Error('No admin user found to send reminders');
    }

    const adminId = adminUsers[0].user_id;

    // Get employee profiles
    const userIds = usersWithoutEOD.map((a: Attendance) => a.user_id);
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    let remindersSent = 0;
    const errors: string[] = [];

    // Send reminder memo to each employee
    for (const profile of profiles || []) {
      try {
        const { error: insertError } = await supabaseClient
          .from('memos')
          .insert({
            sender_id: adminId,
            recipient_id: profile.id,
            type: 'reminder',
            title: '📝 EOD Report Reminder',
            content: `Hello ${profile.full_name},\n\nThis is a friendly reminder to submit your End-of-Day (EOD) report for today.\n\nPlease take a moment to complete your report with:\n• Tasks completed today\n• Client updates (if any)\n• Issues or blockers encountered\n• Any additional notes\n\nThank you for keeping your reports up to date!\n\nBest regards,\nManagement`,
            is_read: false,
          });

        if (insertError) {
          console.error(`Error sending reminder to ${profile.full_name}:`, insertError);
          errors.push(`Failed to send reminder to ${profile.full_name}: ${insertError.message}`);
          continue;
        }

        remindersSent++;
        console.log(`Reminder sent to ${profile.full_name}`);
      } catch (error: any) {
        console.error(`Error processing reminder for ${profile.full_name}:`, error);
        errors.push(`Error processing ${profile.full_name}: ${error.message}`);
      }
    }

    const result = {
      success: true,
      reminders_sent: remindersSent,
      total_employees_checked: usersWithoutEOD.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString(),
    };

    console.log('EOD check completed:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error('Error in check-eod-submission function:', error);
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
