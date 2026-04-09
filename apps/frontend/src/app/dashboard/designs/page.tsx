'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Palette,
  Trash2,
  Copy,
  Download,
  Edit,
  Search,
  LayoutGrid,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { designApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const categories = [
  { value: '', label: 'All Categories' },
  { value: 'SOCIAL_POST', label: 'Social Post' },
  { value: 'FLYER', label: 'Flyer' },
  { value: 'BANNER', label: 'Banner' },
  { value: 'POSTER', label: 'Poster' },
  { value: 'STORY', label: 'Story' },
  { value: 'AD', label: 'Ad' },
];

export default function DesignsPage() {
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDesigns();
  }, [category]);

  const fetchDesigns = async () => {
    setLoading(true);
    try {
      const res = await designApi.getDesigns({
        category: category || undefined,
      });
      setDesigns(res.data?.designs || res.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load designs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await designApi.deleteDesign(id);
      toast.success('Design deleted');
      setDesigns(designs.filter((d) => d.id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete design');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await designApi.duplicateDesign(id);
      toast.success('Design duplicated');
      fetchDesigns();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to duplicate design');
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      const res = await designApi.renderDesign(id, { format: 'png' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name || 'design'}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Design downloaded');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to download design');
    }
  };

  const filteredDesigns = search
    ? designs.filter((d) =>
        d.name?.toLowerCase().includes(search.toLowerCase())
      )
    : designs;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Designs</h1>
          <p className="text-gray-500 mt-1">Create and manage marketing designs and flyers</p>
        </div>
        <Link href="/dashboard/designs/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Design
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search designs..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md font-medium transition-colors',
                category === cat.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Designs Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredDesigns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Palette className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No designs yet</h3>
            <p className="text-gray-500 mb-6">
              Create stunning marketing designs with AI assistance
            </p>
            <Link href="/dashboard/designs/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create your first design
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDesigns.map((design) => (
            <Card key={design.id} className="group overflow-hidden">
              <div className="relative aspect-square bg-gray-100">
                {design.thumbnailUrl || design.previewUrl ? (
                  <img
                    src={design.thumbnailUrl || design.previewUrl}
                    alt={design.name}
                    className="w-full h-full object-cover"
                  />
                ) : design.htmlContent ? (
                  <div className="w-full h-full overflow-hidden">
                    <div
                      className="transform scale-[0.25] origin-top-left w-[400%] h-[400%]"
                      dangerouslySetInnerHTML={{ __html: design.htmlContent }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Palette className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                {/* Overlay actions on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Link href={`/dashboard/designs/${design.id || ''}`}>
                    <Button variant="secondary" size="sm">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownload(design.id, design.name)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{design.name || 'Untitled'}</p>
                    <p className="text-xs text-gray-500">
                      {design.width && design.height
                        ? `${design.width} x ${design.height}`
                        : design.sizePreset || design.category || '-'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <LayoutGrid className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDuplicate(design.id)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(design.id, design.name)}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(design.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
