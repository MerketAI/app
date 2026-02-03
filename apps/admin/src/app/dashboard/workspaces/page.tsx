'use client';

import { useEffect, useState } from 'react';
import { workspacesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Globe,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  FileText,
  Menu as MenuIcon,
} from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  isPublished: boolean;
  url: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    status: string;
    subscription: {
      tier: string;
      status: string;
    } | null;
  };
  _count: {
    pages: number;
    posts: number;
    menus: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadWorkspaces();
  }, [pagination.page, publishedFilter]);

  const loadWorkspaces = async () => {
    try {
      setIsLoading(true);
      const response = await workspacesApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        isPublished: publishedFilter === 'true' ? true : publishedFilter === 'false' ? false : undefined,
      });
      setWorkspaces(response.data.workspaces);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadWorkspaces();
  };

  const handleTogglePublish = async (workspace: Workspace) => {
    try {
      await workspacesApi.togglePublish(workspace.id, !workspace.isPublished);
      loadWorkspaces();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update workspace');
    }
  };

  const handleDelete = async (workspace: Workspace) => {
    if (!confirm(`Are you sure you want to delete the workspace "${workspace.name}"? This will delete all pages, posts, and menus.`)) {
      return;
    }
    try {
      await workspacesApi.delete(workspace.id);
      loadWorkspaces();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete workspace');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
      ACTIVE: 'success',
      PENDING: 'warning',
      SUSPENDED: 'destructive',
      INACTIVE: 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      STARTER: 'bg-blue-100 text-blue-800',
      PROFESSIONAL: 'bg-purple-100 text-purple-800',
      BUSINESS: 'bg-amber-100 text-amber-800',
      ENTERPRISE: 'bg-emerald-100 text-emerald-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[tier] || 'bg-gray-100 text-gray-800'}`}>
        {tier}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workspaces</h1>
        <p className="text-muted-foreground">
          Manage subscriber workspaces and their websites
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Workspaces</p>
                <p className="text-2xl font-bold">{pagination.total}</p>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-green-600">
                  {workspaces.filter(w => w.isPublished).length}
                </p>
              </div>
              <Eye className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pages</p>
                <p className="text-2xl font-bold">
                  {workspaces.reduce((sum, w) => sum + w._count.pages, 0)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold">
                  {workspaces.reduce((sum, w) => sum + w._count.posts, 0)}
                </p>
              </div>
              <MenuIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or slug..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>
            <select
              value={publishedFilter}
              onChange={(e) => {
                setPublishedFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Workspaces Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Workspaces ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive">
              {error}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Posts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workspaces.map((workspace) => (
                    <TableRow key={workspace.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {workspace.logo ? (
                            <img
                              src={workspace.logo}
                              alt={workspace.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Globe className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{workspace.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {workspace.slug}.jeeper.app
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{workspace.user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {workspace.user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {workspace.user.subscription ? (
                          getTierBadge(workspace.user.subscription.tier)
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{workspace._count.pages}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{workspace._count.posts}</span>
                      </TableCell>
                      <TableCell>
                        {workspace.isPublished ? (
                          <Badge variant="success">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(workspace.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://${workspace.url}`, '_blank')}
                            disabled={!workspace.isPublished}
                            title="View Site"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePublish(workspace)}
                            title={workspace.isPublished ? 'Unpublish' : 'Publish'}
                          >
                            {workspace.isPublished ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(workspace)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} workspaces
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                    disabled={pagination.page === pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
