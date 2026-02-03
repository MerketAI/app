'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { postsApi } from '@/lib/api';
import { toast } from 'sonner';

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [creating, setCreating] = useState(false);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    // Auto-generate slug from title
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setSlug(generatedSlug);
  };

  const handleCreate = async () => {
    if (!title) {
      toast.error('Please enter a title');
      return;
    }

    setCreating(true);
    try {
      const response = await postsApi.create({
        title,
        slug: slug || undefined,
        excerpt: excerpt || undefined,
      });
      toast.success('Post created!');
      router.push(`/dashboard/workspace/posts/${response.data.post.id}/edit`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.push('/dashboard/workspace/posts')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Posts
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
        <p className="text-gray-600 mt-2">
          Start writing a new blog post for your website
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
          <CardDescription>
            Enter the basic information for your new post
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter post title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-gray-100 border border-r-0 rounded-l-md text-gray-500 text-sm">
                /blog/
              </span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="post-slug"
                className="rounded-l-none"
              />
            </div>
            <p className="text-xs text-gray-500">
              Leave empty to auto-generate from title
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt (optional)</Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="A brief summary of your post..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/workspace/posts')}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !title}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Post'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
