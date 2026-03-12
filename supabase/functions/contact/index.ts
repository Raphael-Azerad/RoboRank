import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NOTIFICATION_EMAIL = "raphi286@icloud.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      throw new Error("All fields are required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Save to database
    const { error } = await supabaseClient.from("contact_messages").insert({
      name,
      email,
      subject,
      message,
    });

    if (error) throw error;

    // Send notification email via the email queue
    try {
      await supabaseClient.rpc("enqueue_email", {
        queue_name: "transactional_email_queue",
        payload: {
          to: NOTIFICATION_EMAIL,
          subject: `[RoboRank Contact] ${subject}`,
          html: `
            <div style="font-family: 'Space Grotesk', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: hsl(0, 85%, 50%); margin-bottom: 16px;">New Contact Form Submission</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #888; width: 80px;">Name</td><td style="padding: 8px 0;">${name}</td></tr>
                <tr><td style="padding: 8px 0; color: #888;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
                <tr><td style="padding: 8px 0; color: #888;">Subject</td><td style="padding: 8px 0;">${subject}</td></tr>
              </table>
              <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
                <p style="margin: 0; white-space: pre-wrap;">${message}</p>
              </div>
              <p style="margin-top: 24px; font-size: 12px; color: #888;">Sent from the RoboRank contact form</p>
            </div>
          `,
        },
      });
    } catch (emailErr) {
      // Don't fail the request if email fails - message is still saved
      console.error("Failed to enqueue notification email:", emailErr);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
