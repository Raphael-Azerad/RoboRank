import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StickyNote, Plus, Trash2, Edit3, Save, Clock, User, Tag, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { value: "strategy", label: "Strategy", color: "bg-[hsl(var(--chart-2))]/15 text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2))]/30" },
  { value: "strengths", label: "Strengths", color: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30" },
  { value: "weaknesses", label: "Weaknesses", color: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "general", label: "General", color: "bg-muted text-muted-foreground border-border" },
];

interface Note {
  id: string;
  team_number: string;
  user_id: string;
  title: string;
  content: string;
  tagged_team: string | null;
  pinned: boolean;
  category: string | null;
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
  const [taggedTeam, setTaggedTeam] = useState("");
  const [category, setCategory] = useState("general");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterTeam, setFilterTeam] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

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

      const userIds = [...new Set(notesData.map(n => n.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      const emailMap = new Map((profiles || []).map(p => [p.id, p.email]));

      return notesData.map(n => ({
        ...n,
        tagged_team: (n as any).tagged_team || null,
        pinned: (n as any).pinned || false,
        category: (n as any).category || null,
        authorEmail: emailMap.get(n.user_id) || null,
      })) as Note[];
    },
    enabled: !!user.team_number,
  });

  const filteredNotes = (notes || [])
    .filter(n => {
      if (filterTeam && !n.tagged_team?.toLowerCase().includes(filterTeam.toLowerCase())) return false;
      if (filterCategory && n.category !== filterCategory) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

  const uniqueTags = [...new Set((notes || []).map(n => n.tagged_team).filter(Boolean))] as string[];

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    const { error } = await supabase.from("team_notes").insert({
      team_number: user.team_number!,
      user_id: user.id!,
      title: title.trim(),
      content: content.trim(),
      tagged_team: taggedTeam.trim().toUpperCase() || null,
      category,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Note created");
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["teamNotes"] });
  };

  const handleUpdate = async (noteId: string) => {
    const { error } = await supabase.from("team_notes")
      .update({
        title: title.trim(),
        content: content.trim(),
        tagged_team: taggedTeam.trim().toUpperCase() || null,
        category,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", noteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Note updated");
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["teamNotes"] });
  };

  const handleTogglePin = async (note: Note) => {
    const { error } = await supabase.from("team_notes")
      .update({ pinned: !note.pinned } as any)
      .eq("id", note.id);
    if (error) { toast.error(error.message); return; }
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
    setTaggedTeam(note.tagged_team || "");
    setCategory(note.category || "general");
    setCreating(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setCreating(false);
    setTitle("");
    setContent("");
    setTaggedTeam("");
    setCategory("general");
  };

  const getCategoryStyle = (cat: string | null) => {
    return CATEGORIES.find(c => c.value === cat)?.color || CATEGORIES[3].color;
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
            <Button onClick={() => { resetForm(); setCreating(true); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Note
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category filters */}
          {CATEGORIES.map(cat => (
            <Button
              key={cat.value}
              variant={filterCategory === cat.value ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilterCategory(filterCategory === cat.value ? "" : cat.value)}
            >
              {cat.label}
            </Button>
          ))}
          {filterCategory && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFilterCategory("")}>
              Clear
            </Button>
          )}
          {/* Team tag filters */}
          {uniqueTags.length > 0 && (
            <>
              <div className="w-px h-5 bg-border mx-1" />
              {uniqueTags.map(tag => (
                <Button
                  key={tag}
                  variant={filterTeam === tag ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setFilterTeam(filterTeam === tag ? "" : tag)}
                >
                  <Tag className="h-3 w-3" /> {tag}
                </Button>
              ))}
            </>
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
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Tag with team # (e.g. 17505B)"
                    value={taggedTeam}
                    onChange={(e) => setTaggedTeam(e.target.value)}
                    className="bg-card pl-9 uppercase text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                      cat.color,
                      category === cat.value ? "ring-2 ring-primary/50 scale-105" : "opacity-60 hover:opacity-100"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
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
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredNotes.length > 0 ? (
          <div className="space-y-3">
            {filteredNotes.map((note, i) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "rounded-xl border p-5 space-y-3 group",
                  note.pinned ? "border-primary/30 bg-primary/5" : "border-border/50 card-gradient"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {note.pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
                      <h3 className="font-display font-semibold truncate">{note.title || "Untitled"}</h3>
                      {note.category && (
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", getCategoryStyle(note.category))}>
                          {CATEGORIES.find(c => c.value === note.category)?.label}
                        </span>
                      )}
                      {note.tagged_team && (
                        <Badge variant="secondary" className="gap-1 text-[10px] shrink-0">
                          <Tag className="h-2.5 w-2.5" /> {note.tagged_team}
                        </Badge>
                      )}
                    </div>
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
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleTogglePin(note)}>
                        {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </Button>
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
            <p className="text-muted-foreground">
              {filterTeam || filterCategory ? "No notes match your filters" : "No notes yet. Create one to share strategy with your team!"}
            </p>
          </div>
        )}

        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Note</DialogTitle>
              <DialogDescription>Are you sure? This can't be undone.</DialogDescription>
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
