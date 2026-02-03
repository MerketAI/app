'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Newspaper,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { postsApi, workspaceApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt?: string;
  wpPostId?: string;
  wpSyncedAt?: string;
  updatedAt: string;
}

export default function PostsListPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      const params: { status?: string } = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const [postsRes, workspaceRes] = await Promise.all([
        postsApi.list(params),
        workspaceApi.get(),
      ]);
      setPosts(postsRes.data.posts || []);
      setTotal(postsRes.data.total || 0);
      setWorkspaceSlug(workspaceRes.data.workspace?.slug);
    } catch (error: any) {
      if (error.response?.status === 404) {
        router.push('/dashboard/workspace');
      } else {
        toast.error('Failed to load posts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (postId: string) => {
    setActionLoading(postId);
    try {
      await postsApi.publish(postId);
      setPosts(posts.map(p => p.id === postId ? { ...p, status: 'PUBLISHED', publishedAt: new Date().toISOString() } : p));
      toast.success('Post published successfully');
    } catch {
      toast.error('Failed to publish post');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnpublish = async (postId: string) => {
    setActionLoading(postId);
    try {
      await postsApi.unpublish(postId);
      setPosts(posts.map(p => p.id === postId ? { ...p, status: 'DRAFT' } : p));
      toast.success('Post unpublished');
    } catch {
      toast.error('Failed to unpublish post');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deletePostId) return;

    setActionLoading(deletePostId);
    try {
      await postsApi.delete(deletePostId);
      setPosts(posts.filter(p => p.id !== deletePostId));
      toast.success('Post deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete post');
    } finally {
      setActionLoading(null);
      setDeletePostId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
          <p className="text-gray-600">Create and manage your blog posts</p>
        </div>
        <Button onClick={() => router.push('/dashboard/workspace/posts/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Posts</SelectItem>
            <SelectItem value="DRAFT">Drafts</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">{total} posts total</span>
      </div>

      {posts.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Newspaper className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-500 mb-6">
              Start creating blog posts for your website
            </p>
            <Button onClick={() => router.push('/dashboard/workspace/posts/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Post
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Newspaper className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{post.title}</h3>
                        {post.wpPostId && (
                          <Badge variant="outline" className="text-xs">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            WP Synced
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        /blog/{post.slug}
                        {post.excerpt && ` - ${post.excerpt.substring(0, 50)}...`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Badge
                      variant={post.status === 'PUBLISHED' ? 'default' : 'secondary'}
                    >
                      {post.status === 'PUBLISHED' ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Published
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Draft
                        </>
                      )}
                    </Badge>

                    <span className="text-sm text-gray-500">
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/workspace/posts/${post.id}/edit`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actionLoading === post.id}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {workspaceSlug && post.status === 'PUBLISHED' && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(
                                    `https://${workspaceSlug}.jeeper.app/blog/${post.slug}`,
                                    '_blank'
                                  )
                                }
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View Live
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {post.status === 'DRAFT' ? (
                            <DropdownMenuItem onClick={() => handlePublish(post.id)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleUnpublish(post.id)}>
                              <EyeOff className="w-4 h-4 mr-2" />
                              Unpublish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletePostId(post.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
