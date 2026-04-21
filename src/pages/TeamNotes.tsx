import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StickyNote, Plus, Trash2, Edit3, Save, Clock, User, Tag, Pin, PinOff, X, Settings2, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const DEFAULT_CATEGORIES = [
  { value: "strategy", label: "Strategy", color: "bg-[hsl(var(--chart-2))]/15 text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2))]/30" },
  { value: "strengths", label: "Strengths", color: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30" },
  { value: "weaknesses", label: "Weaknesses", color: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "general", label: "General", color: "bg-muted text-muted-foreground border-border" },
];

const CUSTOM_CAT_COLORS = [
  "bg-[hsl(var(--chart-1))]/15 text-[hsl(var(--chart-1))] border-[hsl(var(--chart-1))]/30",
  "bg-[hsl(var(--chart-3))]/15 text-[hsl(var(--chart-3))] border-[hsl(var(--chart-3))]/30",
  "bg-[hsl(var(--chart-4))]/15 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/30",
  "bg-[hsl(var(--chart-5))]/15 text-[hsl(var(--chart-5))] border-[hsl(var(--chart-5))]/30",
  "bg-primary/15 text-primary border-primary/30",
];

function loadCustomCategories(): { value: string; label: string; color: string }[] {
  try {
    const stored = localStorage.getItem("roborank-note-categories");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveCustomCategories(cats: { value: string; label: string; color: string }[]) {
  localStorage.setItem("roborank-note-categories", JSON.stringify(cats));
}

interface Note {
  id: string;
  team_number: string;
  user_id: string;
  title: string;
  content: string;
  tagged_team: string | null;
  match_id: string | null;
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
  const [matchId, setMatchId] = useState("");
  const [category, setCategory] = useState("general");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterTeam, setFilterTeam] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [customCategories, setCustomCategories] = useState(loadCustomCategories);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

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
      const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", userIds);
      const emailMap = new Map((profiles || []).map(p => [p.id, p.email]));
      return notesData.map(n => ({
        ...n,
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
      match_id: matchId.trim() || null,
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
        match_id: matchId.trim() || null,
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
    setMatchId(note.match_id || "");
    setCategory(note.category || "general");
    setCreating(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setCreating(false);
    setTitle("");
    setContent("");
    setTaggedTeam("");
    setMatchId("");
    setCategory("general");
  };

  const getCategoryStyle = (cat: string | null) => {
    return allCategories.find(c => c.value === cat)?.color || DEFAULT_CATEGORIES[3].color;
  };

  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    const value = name.toLowerCase().replace(/\s+/g, "-");
    if (allCategories.some(c => c.value === value)) {
      toast.error("Category already exists");
      return;
    }
    const colorIdx = customCategories.length % CUSTOM_CAT_COLORS.length;
    const newCat = { value, label: name, color: CUSTOM_CAT_COLORS[colorIdx] };
    const updated = [...customCategories, newCat];
    setCustomCategories(updated);
    saveCustomCategories(updated);
    setNewCatName("");
    toast.success(`Added "${name}" category`);
  };

  const handleRemoveCategory = (value: string) => {
    const updated = customCategories.filter(c => c.value !== value);
    setCustomCategories(updated);
    saveCustomCategories(updated);
  };

  if (!user.team_number) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl font-display font-bold">Team Notes</h1>
          <EmptyState
            icon={StickyNote}
            title="Join a team first"
            description="Team Notes let your whole team share scouting insights, match observations, and strategy in one place. Set your team number on your profile to get started."
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Team Notes</h1>
            <p className="text-muted-foreground mt-1">
              Share strategy and notes with your team · {user.team_number}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setShowCatManager(true)}>
              <Settings2 className="h-4 w-4" />
            </Button>
            {!creating && !editingId && (
              <Button onClick={() => { resetForm(); setCreating(true); }} className="gap-1.5">
                <Plus className="h-4 w-4" /> New Note
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {allCategories.map(cat => (
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
              <Input placeholder="Note title..." value={title} onChange={(e) => setTitle(e.target.value)} className="bg-card font-medium" />
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Tag with team # (e.g. 1234A)" value={taggedTeam} onChange={(e) => setTaggedTeam(e.target.value)} className="bg-card pl-9 uppercase text-sm" />
                </div>
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Match (e.g. Q-12, F-1)" value={matchId} onChange={(e) => setMatchId(e.target.value)} className="bg-card pl-9 text-sm" />
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {allCategories.map(cat => (
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
              <Textarea placeholder="Write your strategy, observations, or notes here..." value={content} onChange={(e) => setContent(e.target.value)} className="bg-card min-h-[120px] resize-y" />
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
                          {allCategories.find(c => c.value === note.category)?.label || note.category}
                        </span>
                      )}
                      {note.tagged_team && (
                        <Badge variant="secondary" className="gap-1 text-[10px] shrink-0">
                          <Tag className="h-2.5 w-2.5" /> {note.tagged_team}
                        </Badge>
                      )}
                      {note.match_id && (
                        <Badge variant="outline" className="gap-1 text-[10px] shrink-0 border-primary/40 text-primary">
                          <Hash className="h-2.5 w-2.5" /> {note.match_id}
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
          <EmptyState
            icon={StickyNote}
            title={filterTeam || filterCategory ? "No matching notes" : "No notes yet"}
            description={
              filterTeam || filterCategory
                ? "Try clearing your filters to see all team notes."
                : "Capture strategy, robot strengths, alliance ideas, or per-match observations. Notes are shared with your whole team."
            }
            action={
              !filterTeam && !filterCategory ? (
                <Button onClick={() => { resetForm(); setCreating(true); }} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Create your first note
                </Button>
              ) : undefined
            }
          />
        )}

        {/* Delete Confirm */}
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

        {/* Category Manager Dialog */}
        <Dialog open={showCatManager} onOpenChange={setShowCatManager}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Categories</DialogTitle>
              <DialogDescription>Add or remove custom note categories. Default categories cannot be removed.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Default categories */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Default</p>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_CATEGORIES.map(cat => (
                    <span key={cat.value} className={cn("px-3 py-1 rounded-full text-xs font-medium border", cat.color)}>
                      {cat.label}
                    </span>
                  ))}
                </div>
              </div>
              {/* Custom categories */}
              {customCategories.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Custom</p>
                  <div className="flex flex-wrap gap-1.5">
                    {customCategories.map(cat => (
                      <span key={cat.value} className={cn("px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5", cat.color)}>
                        {cat.label}
                        <button onClick={() => handleRemoveCategory(cat.value)} className="hover:opacity-70">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Add new */}
              <div className="flex gap-2">
                <Input
                  placeholder="New category name..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                />
                <Button onClick={handleAddCategory} size="sm" className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
