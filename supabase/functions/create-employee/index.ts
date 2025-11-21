import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface CreateEmployeeRequest {
  email: string;
  password: string;
  fullName: string;
  position?: string;
  department?: string;
  contactPhone?: string;
  startDate: string;
  employmentType: 'hourly' | 'salaried';
  hourlyRate?: number;
  monthlySalary?: number;
  photoUrl?: string;
  adminId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const requestData: CreateEmployeeRequest = await req.json();

    console.log('Create employee request received:', { 
      email: requestData.email, 
      adminId: requestData.adminId 
    });

    // Verify the requester is an admin
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestData.adminId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !adminRole) {
      console.error('Authorization failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: requestData.email,
      password: requestData.password,
      email_confirm: true,
      user_metadata: {
        full_name: requestData.fullName,
      },
    });

    if (authError) {
      console.error('Auth user creation failed:', authError);
      throw authError;
    }

    const userId = authData.user.id;
    console.log('Auth user created successfully:', userId);

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: requestData.fullName,
        position: requestData.position,
        department: requestData.department,
        contact_email: requestData.email,
        contact_phone: requestData.contactPhone,
        photo_url: requestData.photoUrl,
        hourly_rate: requestData.employmentType === 'hourly' ? requestData.hourlyRate : null,
        monthly_salary: requestData.employmentType === 'salaried' ? requestData.monthlySalary : null,
        start_date: requestData.startDate,
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update failed:', profileError);
      throw profileError;
    }

    console.log('Profile updated successfully');

    // Assign employee role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'employee' });

    if (roleInsertError) {
      console.error('Role assignment failed:', roleInsertError);
      throw roleInsertError;
    }

    console.log('Employee role assigned successfully');

    // Send welcome email
    const appUrl = req.headers.get('origin') || 'https://your-app.lovableproject.com';
    
    try {
      await resend.emails.send({
        from: "Lovable <onboarding@resend.dev>",
        to: [requestData.email],
        subject: "Welcome to the Team!",
        html: `
          <h1>Welcome, ${requestData.fullName}!</h1>
          <p>Your employee account has been created successfully.</p>
          <p><strong>Login Details:</strong></p>
          <ul>
            <li>Email: ${requestData.email}</li>
            <li>Password: ${requestData.password}</li>
          </ul>
          ${requestData.position ? `<p>Position: ${requestData.position}</p>` : ''}
          ${requestData.department ? `<p>Department: ${requestData.department}</p>` : ''}
          <p>Start Date: ${new Date(requestData.startDate).toLocaleDateString()}</p>
          <p><a href="${appUrl}/auth">Login to your account</a></p>
          <p>Please change your password after your first login.</p>
        `,
      });
      console.log('Welcome email sent successfully');
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the entire operation if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Employee created successfully',
        userId: userId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in create-employee function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create employee' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});