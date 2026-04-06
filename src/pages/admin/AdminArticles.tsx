import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, Trash2, Pencil } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import { useNavigate } from "react-router-dom";

export default function AdminArticles() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", content: "", excerpt: "", status: "draft", cover_image: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchArticles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("articles")
      .select("*, profiles:author_id(full_name)")
      .order("created_at", { ascending: false });
    setArticles(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, []);

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `articles/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("articles").upload(filePath, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("articles").getPublicUrl(filePath);
    setForm((f) => ({ ...f, cover_image: urlData.publicUrl }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const adminUser = (await supabase.auth.getUser()).data.user;
    const payload: any = {
      title: form.title,
      slug: form.slug || generateSlug(form.title),
      content: form.content,
      excerpt: form.excerpt,
      status: form.status,
      cover_image: form.cover_image || null,
      author_id: adminUser?.id,
    };
    if (form.status === "published") {
      payload.published_at = new Date().toISOString();
    }

    let error;
    if (editId) {
      ({ error } = await supabase.from("articles").update(payload).eq("id", editId));
    } else {
      ({ error } = await supabase.from("articles").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("admin_logs").insert({
      admin_id: adminUser?.id,
      action: editId ? "Article updated" : "Article created",
      target_id: editId || "new",
      target_type: "article",
    });

    toast({ title: editId ? "Article updated" : "Article created" });
    resetForm();
    fetchArticles();
  };

  const resetForm = () => {
    setDialogOpen(false);
    setForm({ title: "", slug: "", content: "", excerpt: "", status: "draft", cover_image: "" });
    setEditId(null);
  };

  const openEdit = (article: any) => {
    setForm({
      title: article.title,
      slug: article.slug,
      content: article.content || "",
      excerpt: article.excerpt || "",
      status: article.status,
      cover_image: article.cover_image || "",
    });
    setEditId(article.id);
    setDialogOpen(true);
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    await supabase.from("articles").delete().eq("id", id);
    const adminUser = (await supabase.auth.getUser()).data.user;
    await supabase.from("admin_logs").insert({
      admin_id: adminUser?.id,
      action: "Article deleted",
      target_id: id,
      target_type: "article",
    });
    toast({ title: "Article deleted" });
    fetchArticles();
  };

  const togglePublish = async (article: any) => {
    const newStatus = article.status === "published" ? "draft" : "published";
    const update: any = { status: newStatus };
    if (newStatus === "published") update.published_at = new Date().toISOString();
    await supabase.from("articles").update(update).eq("id", article.id);
    toast({ title: newStatus === "published" ? "Article published" : "Article unpublished" });
    fetchArticles();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Articles</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Article</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Article" : "New Article"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated from title" />
              </div>
              <div>
                <Label>Excerpt</Label>
                <Input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Short summary..." />
              </div>
              <div>
                <Label>Featured Image</Label>
                <div className="space-y-2">
                  {form.cover_image && (
                    <img src={form.cover_image} alt="Cover" className="w-full max-h-48 object-cover rounded-lg" />
                  )}
                  <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                  {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
                </div>
              </div>
              <div>
                <Label>Content</Label>
                <RichTextEditor
                  value={form.content}
                  onChange={(html) => setForm({ ...form, content: html })}
                  placeholder="Write your article content..."
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={uploading}>
                {editId ? "Update Article" : "Create Article"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Articles ({articles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium max-w-48 truncate">{a.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(a.profiles as any)?.full_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.status === "published" ? "default" : "outline"}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => togglePublish(a)}>
                          {a.status === "published" ? "Unpublish" : "Publish"}
                        </Button>
                        {a.status === "published" && (
                          <Button size="sm" variant="outline" onClick={() => navigate(`/articles/${a.slug}`)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => deleteArticle(a.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
