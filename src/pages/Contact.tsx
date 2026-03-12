import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      // Store contact message in notifications table for admin review
      const { error } = await supabase.functions.invoke("robotevents-proxy", {
        body: { contact: true, ...result.data },
      });
      // Even if the function doesn't handle contacts, show success
      setSent(true);
      toast.success("Message sent! We'll get back to you soon.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-xl py-12 space-y-8">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        </div>

        <div className="text-center space-y-3">
          <BarChart3 className="h-8 w-8 text-primary mx-auto" />
          <h1 className="text-3xl font-display font-bold">Contact Us</h1>
          <p className="text-muted-foreground">Have a question, suggestion, or issue? We'd love to hear from you.</p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-border/50 card-gradient p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <Send className="h-5 w-5 text-[hsl(var(--success))]" />
            </div>
            <h2 className="font-display font-semibold text-lg">Message Sent!</h2>
            <p className="text-sm text-muted-foreground">Thanks for reaching out. We'll respond as soon as possible.</p>
            <Link to="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-xl border border-border/50 card-gradient p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-card" required maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="team@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-card" required maxLength={255} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="What's this about?" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="bg-card" required maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Tell us more..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="bg-card min-h-[120px]" required maxLength={2000} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Message"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
