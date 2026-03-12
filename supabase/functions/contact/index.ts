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

    // Queue notification email via transactional email queue
    const messageId = crypto.randomUUID();

    const { error: pendingLogError } = await supabaseClient.from("email_send_log").insert({
      message_id: messageId,
      template_name: "contact-form",
      recipient_email: NOTIFICATION_EMAIL,
      status: "pending",
    });
    if (pendingLogError) throw pendingLogError;

    const { error: enqueueError } = await supabaseClient.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: NOTIFICATION_EMAIL,
        from: "RoboRank Admin <noreply@roborank.site>",
        sender_domain: "roborank.site",
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
        text: `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
        purpose: "transactional",
        label: "contact-form",
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      await supabaseClient.from("email_send_log").insert({
        message_id: messageId,
        template_name: "contact-form",
        recipient_email: NOTIFICATION_EMAIL,
        status: "failed",
        error_message: "Failed to enqueue contact email",
      });
      throw enqueueError;
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
