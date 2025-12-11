import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FeedbackNotificationRequest {
  recipientId: string;
  adminName: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { recipientId, adminName, message }: FeedbackNotificationRequest = await req.json();

    console.log("Sending feedback notification to recipient:", recipientId);

    // Get recipient's email and name
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, contact_email")
      .eq("id", recipientId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      throw new Error("Could not find recipient profile");
    }

    // Get email from auth.users if not in profile
    let recipientEmail = profile.contact_email;
    if (!recipientEmail) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(recipientId);
      if (authError || !authUser.user?.email) {
        console.error("Error fetching auth user:", authError);
        throw new Error("Could not find recipient email");
      }
      recipientEmail = authUser.user.email;
    }

    console.log("Sending email to:", recipientEmail);

    const messageSection = message
      ? `<p style="margin-top: 16px; padding: 12px; background-color: #f3f4f6; border-radius: 8px; color: #4b5563;">"${message}"</p>`
      : "";

    const emailResponse = await resend.emails.send({
      from: "HR Portal <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: "Feedback Request from Admin",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1f2937;">Feedback Request</h1>
          <p style="color: #4b5563; font-size: 16px;">
            Hi ${profile.full_name},
          </p>
          <p style="color: #4b5563; font-size: 16px;">
            ${adminName} has requested your feedback. Please log in to the HR portal to submit your feedback.
          </p>
          ${messageSection}
          <p style="color: #4b5563; font-size: 16px; margin-top: 24px;">
            Your feedback helps us improve our workplace. Thank you for your input!
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            Best regards,<br>
            HR Team
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-feedback-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
