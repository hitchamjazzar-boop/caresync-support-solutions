import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
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
    const { recipientId, adminName, message }: NotificationRequest = await req.json();
    
    console.log("Processing shoutout request notification for recipient:", recipientId);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get recipient's email and name
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, contact_email")
      .eq("id", recipientId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch recipient profile" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!profile.contact_email) {
      console.log("No email found for recipient, skipping email notification");
      return new Response(
        JSON.stringify({ success: true, message: "No email configured for recipient" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending email to:", profile.contact_email);

    // Send email notification using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Care Sync <onboarding@resend.dev>",
        to: [profile.contact_email],
        subject: "🎉 You've been asked to give a Shout Out!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #7c3aed;">Hi ${profile.full_name}!</h1>
            <p style="font-size: 16px; color: #333;">
              <strong>${adminName}</strong> has asked you to recognize a colleague with a shout out.
            </p>
            ${message ? `
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #666; font-style: italic;">"${message}"</p>
              </div>
            ` : ''}
            <p style="font-size: 16px; color: #333;">
              Take a moment to think about who has helped you recently or gone above and beyond, 
              and give them the recognition they deserve!
            </p>
            <p style="font-size: 14px; color: #666;">
              Log in to Care Sync to submit your shout out. Your recognition will be anonymous 
              when published.
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #999;">
                This is an automated message from Care Sync Support Solutions.
              </p>
            </div>
          </div>
        `,
      }),
    });

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, emailResponse: emailData }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-shoutout-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
