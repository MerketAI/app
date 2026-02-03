'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Settings,
  Loader2,
  Image as ImageIcon,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { postsApi, workspaceApi, platformsApi } from '@/lib/api';
import { toast } from 'sonner';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  status: 'DRAFT' | 'PUBLISHED';
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  tags: string[];
  categories: string[];
  wpPostId?: string;
  wpSyncedAt?: string;
  wpConnectionId?: string;
}

interface PlatformConnection {
  id: string;
  platform: string;
  accountName?: string;
  status: string;
}

export default function PostEditorPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);
  const [wpConnections, setWpConnections] = useState<PlatformConnection[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [tags, setTags] = useState('');
  const [categories, setCategories] = useState('');

  useEffect(() => {
    fetchData();
  }, [postId]);

  const fetchData = async () => {
    try {
      const [postRes, workspaceRes, platformsRes] = await Promise.all([
        postsApi.get(postId),
        workspaceApi.get(),
        platformsApi.getConnections(),
      ]);

      const postData = postRes.data.post;
      setPost(postData);
      setTitle(postData.title);
      setContent(postData.content || '');
      setExcerpt(postData.excerpt || '');
      setFeaturedImage(postData.featuredImage || '');
      setSeoTitle(postData.seoTitle || '');
      setSeoDescription(postData.seoDescription || '');
      setSeoKeywords(postData.seoKeywords || '');
      setTags(postData.tags?.join(', ') || '');
      setCategories(postData.categories?.join(', ') || '');

      setWorkspaceSlug(workspaceRes.data.workspace?.slug);

      // Filter WordPress connections
      const connections = platformsRes.data.connections || [];
      setWpConnections(
        connections.filter(
          (c: PlatformConnection) => c.platform === 'WORDPRESS' && c.status === 'CONNECTED'
        )
      );
    } catch (error) {
      toast.error('Failed to load post');
      router.push('/dashboard/workspace/posts');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!post) return;

    setSaving(true);
    try {
      await postsApi.update(postId, {
        title,
        content,
        excerpt,
        featuredImage: featuredImage || undefined,
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
        seoKeywords: seoKeywords || undefined,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        categories: categories ? categories.split(',').map(c => c.trim()) : [],
      });
      setIsDirty(false);
      toast.success('Post saved successfully');
    } catch (error) {
      toast.error('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      await postsApi.publish(postId);
      setPost(post ? { ...post, status: 'PUBLISHED' } : null);
      toast.success('Post published!');
    } catch {
      toast.error('Failed to publish post');
    }
  };

  const handleUnpublish = async () => {
    try {
      await postsApi.unpublish(postId);
      setPost(post ? { ...post, status: 'DRAFT' } : null);
      toast.success('Post unpublished');
    } catch {
      toast.error('Failed to unpublish post');
    }
  };

  const handleSyncToWordPress = async (connectionId: string) => {
    setSyncing(true);
    try {
      // First save the post
      await postsApi.update(postId, {
        title,
        content,
        excerpt,
        featuredImage: featuredImage || undefined,
      });

      // Then sync
      const response = await postsApi.syncToWordPress(postId, connectionId);
      setPost(response.data.post);
      toast.success('Post synced to WordPress!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to sync to WordPress');
    } finally {
      setSyncing(false);
    }
  };

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/workspace/posts')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-gray-200" />
            <Badge variant={post.status === 'PUBLISHED' ? 'default' : 'secondary'}>
              {post.status}
            </Badge>
            {post.wpPostId && (
              <Badge variant="outline">
                <RefreshCw className="w-3 h-3 mr-1" />
                WP Synced
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* WordPress Sync */}
            {wpConnections.length > 0 && (
              <Select
                onValueChange={handleSyncToWordPress}
                disabled={syncing}
              >
                <SelectTrigger className="w-[180px]">
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  <span>Sync to WordPress</span>
                </SelectTrigger>
                <SelectContent>
                  {wpConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.accountName || 'WordPress Site'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Settings */}
            <Sheet open={showSettings} onOpenChange={setShowSettings}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Post Settings</SheetTitle>
                  <SheetDescription>
                    Configure post metadata and SEO
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label>Featured Image URL</Label>
                    <Input
                      value={featuredImage}
                      onChange={(e) => {
                        setFeaturedImage(e.target.value);
                        markDirty();
                      }}
                      placeholder="https://..."
                    />
                    {featuredImage && (
                      <img
                        src={featuredImage}
                        alt="Featured"
                        className="w-full h-32 object-cover rounded-lg mt-2"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>SEO Title</Label>
                    <Input
                      value={seoTitle}
                      onChange={(e) => {
                        setSeoTitle(e.target.value);
                        markDirty();
                      }}
                      placeholder="SEO optimized title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SEO Description</Label>
                    <Textarea
                      value={seoDescription}
                      onChange={(e) => {
                        setSeoDescription(e.target.value);
                        markDirty();
                      }}
                      placeholder="Meta description for search engines"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SEO Keywords</Label>
                    <Input
                      value={seoKeywords}
                      onChange={(e) => {
                        setSeoKeywords(e.target.value);
                        markDirty();
                      }}
                      placeholder="keyword1, keyword2, keyword3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <Input
                      value={tags}
                      onChange={(e) => {
                        setTags(e.target.value);
                        markDirty();
                      }}
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categories</Label>
                    <Input
                      value={categories}
                      onChange={(e) => {
                        setCategories(e.target.value);
                        markDirty();
                      }}
                      placeholder="category1, category2"
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Preview */}
            {workspaceSlug && post.status === 'PUBLISHED' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  window.open(
                    `https://${workspaceSlug}.jeeper.app/blog/${post.slug}`,
                    '_blank'
                  )
                }
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View
              </Button>
            )}

            {/* Publish/Unpublish */}
            {post.status === 'PUBLISHED' ? (
              <Button variant="outline" size="sm" onClick={handleUnpublish}>
                <EyeOff className="w-4 h-4 mr-2" />
                Unpublish
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handlePublish}>
                <Eye className="w-4 h-4 mr-2" />
                Publish
              </Button>
            )}

            {/* Save */}
            <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? 'Saving...' : isDirty ? 'Save*' : 'Saved'}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            placeholder="Post Title"
            className="w-full text-4xl font-bold border-none outline-none placeholder:text-gray-300 mb-4"
          />

          {/* Slug */}
          <div className="flex items-center text-sm text-gray-500 mb-6">
            <span>/blog/</span>
            <span className="text-gray-700">{post.slug}</span>
          </div>

          {/* Excerpt */}
          <div className="mb-6">
            <Label className="text-sm text-gray-500">Excerpt</Label>
            <Textarea
              value={excerpt}
              onChange={(e) => {
                setExcerpt(e.target.value);
                markDirty();
              }}
              placeholder="A brief summary of your post..."
              className="mt-1 border-gray-200"
              rows={2}
            />
          </div>

          {/* Content */}
          <div>
            <Label className="text-sm text-gray-500">Content</Label>
            <Textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                markDirty();
              }}
              placeholder="Write your post content here...

You can use HTML for formatting:
<h2>Heading</h2>
<p>Paragraph text</p>
<ul><li>List item</li></ul>
<a href='#'>Link</a>
<img src='url' alt='description' />
<blockquote>Quote</blockquote>"
              className="mt-1 border-gray-200 font-mono text-sm min-h-[400px]"
              rows={20}
            />
            <p className="text-xs text-gray-500 mt-2">
              You can use HTML tags for formatting. A rich text editor will be added soon.
            </p>
          </div>

          {/* Featured Image Preview */}
          {featuredImage && (
            <div className="mt-6">
              <Label className="text-sm text-gray-500">Featured Image</Label>
              <img
                src={featuredImage}
                alt="Featured"
                className="w-full h-48 object-cover rounded-lg mt-2"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
