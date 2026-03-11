import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Hash } from "lucide-react";
import { motion } from "framer-motion";

export default function Profile() {
  const [user, setUser] = useState<{ email?: string; team_number?: string }>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser({
        email: data.user?.email,
        team_number: data.user?.user_metadata?.team_number,
      });
    });
  }, []);

  return (
    <AppLayout>
      <div className="max-w-lg space-y-6">
        <h1 className="text-3xl font-display font-bold">Profile</h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 card-gradient p-8 space-y-6"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-4">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">{user.team_number || "—"}</h2>
              <p className="text-sm text-muted-foreground">VEX Robotics Team</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Team Number:</span>
              <span className="font-medium">{user.team_number || "—"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{user.email || "—"}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
