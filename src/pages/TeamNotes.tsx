import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StickyNote, Plus, Trash2, Edit3, Save, X, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Note {
  id: string;
  team_number: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  authorEmail?: string;
}

export default function TeamNotes() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<{ id?: string; email?: string; team_number?: string | null }>({});
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser({
        id: data.user?.id,
        email: data.user?.email,
        team_number: data.user?.user_metadata?.team_number || null,
      });
    });
  }, []);

  const { data: notes, isLoading } = useQuery({
    queryKey: ["teamNotes", user.team_number],
    queryFn: async () => {
      if (!user.team_number) return [];
      const { data: notesData, error } = await supabase
        .from("team_notes")
        .select("*")
        .eq("team_number", user.team_number)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      if (!notesData || notesData.length === 0) return [];

      // Get author emails
      const userIds = [...new Set(notesData.map(n => n.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      const emailMap = new Map((profiles || []).map(p => [p.id, p.email]));

      return notesData.map(n => ({
        ...n,
        authorEmail: emailMap.get(n.user_id) || null,
      })) as Note[];
    },
    enabled: !!user.team_number,
  });

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    const { error } = await supabase.from("team_notes").insert({
      team_number: user.team_number!,
      user_id: user.id!,
      title: title.trim(),
      content: content.trim(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Note created");
    setTitle("");
    setContent("");
    setCreating(false);
    queryClient.invalidateQueries({ queryKey: ["teamNotes"] });
  };

  const handleUpdate = async (noteId: string) => {
    const { error } = await supabase.from("team_notes")
      .update({ title: title.trim(), content: content.trim(), updated_at: new Date().toISOString() })
      .eq("id", noteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Note updated");
    setEditingId(null);
    setTitle("");
    setContent("");
    queryClient.invalidateQueries({ queryKey: ["teamNotes"] });
  };

  const handleDelete = async (noteId: string) => {
    const { error } = await supabase.from("team_notes").delete().eq("id", noteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Note deleted");
    setDeleteConfirm(null);
    queryClient.invalidateQueries({ queryKey: ["teamNotes"] });
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCreating(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCreating(false);
    setTitle("");
    setContent("");
  };

  if (!user.team_number) {
    return (
      <AppLayout>
        <div className="max-w-2xl space-y-6">
          <h1 className="text-3xl font-display font-bold">Team Notes</h1>
          <div className="rounded-xl border border-border/50 card-gradient p-8 text-center space-y-3">
            <StickyNote className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Join a team to start sharing notes and strategy</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Team Notes</h1>
            <p className="text-muted-foreground mt-1">
              Share strategy and notes with your team · {user.team_number}
            </p>
          </div>
          {!creating && !editingId && (
            <Button onClick={() => { setCreating(true); setTitle(""); setContent(""); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Note
            </Button>
          )}
        </div>

        {/* Create/Edit Form */}
        <AnimatePresence>
          {(creating || editingId) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3"
            >
              <Input
                placeholder="Note title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-card font-medium"
              />
              <Textarea
                placeholder="Write your strategy, observations, or notes here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-card min-h-[120px] resize-y"
              />
              <div className="flex gap-2">
                {editingId ? (
                  <Button onClick={() => handleUpdate(editingId)} className="gap-1.5">
                    <Save className="h-3.5 w-3.5" /> Save Changes
                  </Button>
                ) : (
                  <Button onClick={handleCreate} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Create Note
                  </Button>
                )}
                <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : notes && notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((note, i) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border/50 card-gradient p-5 space-y-3 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold truncate">{note.title || "Untitled"}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {note.user_id === user.id ? "You" : (note.authorEmail || "Team member")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(note.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {note.user_id === user.id && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(note)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteConfirm(note.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {note.content && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{note.content}</p>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 card-gradient p-8 text-center space-y-3">
            <StickyNote className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No notes yet. Create one to share strategy with your team!</p>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Note</DialogTitle>
              <DialogDescription>Are you sure you want to delete this note? This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}