import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import React from "https://esm.sh/react@18.3.1";
import { renderAsync } from "https://esm.sh/@react-email/components@0.0.22";
import { WelcomeEmail } from "./_templates/welcome-email.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  fullName: string;
  email: string;
  password: string;
  position?: string;
  department?: string;
  appUrl: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fullName, email, password, position, department, appUrl }: WelcomeEmailRequest = await req.json();

    console.log('Sending welcome email to:', email);

    const html = await renderAsync(
      React.createElement(WelcomeEmail, {
        fullName,
        email,
        password,
        position,
        department,
        appUrl,
      })
    );

    const emailResponse = await resend.emails.send({
      from: "Care Sync Support Solutions <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Care Sync Support Solutions - Your Login Credentials",
      html,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
