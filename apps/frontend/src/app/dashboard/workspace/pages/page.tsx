'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  FileCode,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Home,
  ExternalLink,
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
import { pagesApi, workspaceApi } from '@/lib/api';
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

interface Page {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status: 'DRAFT' | 'PUBLISHED';
  isHomePage: boolean;
  updatedAt: string;
}

export default function PagesListPage() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pagesRes, workspaceRes] = await Promise.all([
        pagesApi.list(),
        workspaceApi.get(),
      ]);
      setPages(pagesRes.data.pages || []);
      setWorkspaceSlug(workspaceRes.data.workspace?.slug);
    } catch (error: any) {
      if (error.response?.status === 404) {
        router.push('/dashboard/workspace');
      } else {
        toast.error('Failed to load pages');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (pageId: string) => {
    setActionLoading(pageId);
    try {
      await pagesApi.publish(pageId);
      setPages(pages.map(p => p.id === pageId ? { ...p, status: 'PUBLISHED' } : p));
      toast.success('Page published successfully');
    } catch {
      toast.error('Failed to publish page');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnpublish = async (pageId: string) => {
    setActionLoading(pageId);
    try {
      await pagesApi.unpublish(pageId);
      setPages(pages.map(p => p.id === pageId ? { ...p, status: 'DRAFT' } : p));
      toast.success('Page unpublished');
    } catch {
      toast.error('Failed to unpublish page');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (pageId: string) => {
    setActionLoading(pageId);
    try {
      const response = await pagesApi.duplicate(pageId);
      setPages([...pages, response.data.page]);
      toast.success('Page duplicated successfully');
    } catch {
      toast.error('Failed to duplicate page');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deletePageId) return;

    setActionLoading(deletePageId);
    try {
      await pagesApi.delete(deletePageId);
      setPages(pages.filter(p => p.id !== deletePageId));
      toast.success('Page deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete page');
    } finally {
      setActionLoading(null);
      setDeletePageId(null);
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
          <h1 className="text-3xl font-bold text-gray-900">Pages</h1>
          <p className="text-gray-600">Create and manage your website pages</p>
        </div>
        <Button onClick={() => router.push('/dashboard/workspace/pages/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Page
        </Button>
      </div>

      {pages.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileCode className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pages yet</h3>
            <p className="text-gray-500 mb-6">
              Get started by creating your first page with AI
            </p>
            <Button onClick={() => router.push('/dashboard/workspace/pages/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Page
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pages.map((page) => (
            <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileCode className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{page.title}</h3>
                        {page.isHomePage && (
                          <Badge variant="secondary" className="text-xs">
                            <Home className="w-3 h-3 mr-1" />
                            Home
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">/{page.slug}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Badge
                      variant={page.status === 'PUBLISHED' ? 'default' : 'secondary'}
                    >
                      {page.status === 'PUBLISHED' ? (
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
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/workspace/pages/${page.id}/edit`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actionLoading === page.id}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {workspaceSlug && page.status === 'PUBLISHED' && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(
                                    `https://${workspaceSlug}.jeeper.app/${page.slug}`,
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
                          {page.status === 'DRAFT' ? (
                            <DropdownMenuItem onClick={() => handlePublish(page.id)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleUnpublish(page.id)}>
                              <EyeOff className="w-4 h-4 mr-2" />
                              Unpublish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDuplicate(page.id)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletePageId(page.id)}
                            className="text-red-600"
                            disabled={page.isHomePage}
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

      <AlertDialog open={!!deletePageId} onOpenChange={() => setDeletePageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this page? This action cannot be undone.
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
