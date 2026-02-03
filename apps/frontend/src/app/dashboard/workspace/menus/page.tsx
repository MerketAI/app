'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Menu as MenuIcon,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronRight,
  Link as LinkIcon,
  FileCode,
  Newspaper,
  ExternalLink,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { menusApi } from '@/lib/api';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  label: string;
  type: 'page' | 'post' | 'custom' | 'external';
  pageId?: string;
  postId?: string;
  url?: string;
  target?: string;
  children?: MenuItem[];
}

interface Menu {
  id: string;
  name: string;
  location: 'HEADER' | 'FOOTER' | 'SIDEBAR';
  items: MenuItem[];
  isActive: boolean;
}

interface MenuOption {
  id: string;
  title: string;
  slug: string;
}

const LOCATIONS = [
  { value: 'HEADER', label: 'Header Navigation' },
  { value: 'FOOTER', label: 'Footer Navigation' },
  { value: 'SIDEBAR', label: 'Sidebar Navigation' },
];

export default function MenusPage() {
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [pages, setPages] = useState<MenuOption[]>([]);
  const [posts, setPosts] = useState<MenuOption[]>([]);

  // Add item dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItemType, setNewItemType] = useState<'page' | 'post' | 'custom' | 'external'>('page');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemPageId, setNewItemPageId] = useState('');
  const [newItemPostId, setNewItemPostId] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemTarget, setNewItemTarget] = useState('_self');

  // Create menu dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuLocation, setNewMenuLocation] = useState<'HEADER' | 'FOOTER' | 'SIDEBAR'>('HEADER');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [menusRes, optionsRes] = await Promise.all([
        menusApi.list(),
        menusApi.getOptions(),
      ]);
      setMenus(menusRes.data.menus || []);
      setPages(optionsRes.data.pages || []);
      setPosts(optionsRes.data.posts || []);

      // Select first menu if available
      if (menusRes.data.menus?.length > 0) {
        setSelectedMenu(menusRes.data.menus[0]);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        router.push('/dashboard/workspace');
      } else {
        toast.error('Failed to load menus');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMenu = async () => {
    if (!newMenuName) {
      toast.error('Please enter a menu name');
      return;
    }

    try {
      const response = await menusApi.create({
        name: newMenuName,
        location: newMenuLocation,
      });
      const newMenu = response.data.menu;
      setMenus([...menus, newMenu]);
      setSelectedMenu(newMenu);
      setShowCreateDialog(false);
      setNewMenuName('');
      toast.success('Menu created successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create menu');
    }
  };

  const handleAddItem = () => {
    if (!selectedMenu) return;

    let newItem: MenuItem;
    const id = `item-${Date.now()}`;

    switch (newItemType) {
      case 'page':
        if (!newItemPageId) {
          toast.error('Please select a page');
          return;
        }
        const page = pages.find(p => p.id === newItemPageId);
        newItem = {
          id,
          label: newItemLabel || page?.title || 'Page',
          type: 'page',
          pageId: newItemPageId,
        };
        break;
      case 'post':
        if (!newItemPostId) {
          toast.error('Please select a post');
          return;
        }
        const post = posts.find(p => p.id === newItemPostId);
        newItem = {
          id,
          label: newItemLabel || post?.title || 'Post',
          type: 'post',
          postId: newItemPostId,
        };
        break;
      case 'custom':
        if (!newItemLabel || !newItemUrl) {
          toast.error('Please enter label and URL');
          return;
        }
        newItem = {
          id,
          label: newItemLabel,
          type: 'custom',
          url: newItemUrl,
          target: newItemTarget,
        };
        break;
      case 'external':
        if (!newItemLabel || !newItemUrl) {
          toast.error('Please enter label and URL');
          return;
        }
        newItem = {
          id,
          label: newItemLabel,
          type: 'external',
          url: newItemUrl,
          target: '_blank',
        };
        break;
    }

    setSelectedMenu({
      ...selectedMenu,
      items: [...selectedMenu.items, newItem],
    });

    // Reset form
    setShowAddDialog(false);
    setNewItemLabel('');
    setNewItemPageId('');
    setNewItemPostId('');
    setNewItemUrl('');
    setNewItemTarget('_self');
  };

  const handleRemoveItem = (itemId: string) => {
    if (!selectedMenu) return;

    setSelectedMenu({
      ...selectedMenu,
      items: selectedMenu.items.filter(item => item.id !== itemId),
    });
  };

  const handleSaveMenu = async () => {
    if (!selectedMenu) return;

    setSaving(true);
    try {
      await menusApi.updateItems(selectedMenu.id, selectedMenu.items);
      toast.success('Menu saved successfully');
    } catch (error) {
      toast.error('Failed to save menu');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMenu = async (menuId: string) => {
    try {
      await menusApi.delete(menuId);
      setMenus(menus.filter(m => m.id !== menuId));
      if (selectedMenu?.id === menuId) {
        setSelectedMenu(menus.length > 1 ? menus.find(m => m.id !== menuId) || null : null);
      }
      toast.success('Menu deleted');
    } catch {
      toast.error('Failed to delete menu');
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'page':
        return <FileCode className="w-4 h-4" />;
      case 'post':
        return <Newspaper className="w-4 h-4" />;
      case 'external':
        return <ExternalLink className="w-4 h-4" />;
      default:
        return <LinkIcon className="w-4 h-4" />;
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
          <h1 className="text-3xl font-bold text-gray-900">Menus</h1>
          <p className="text-gray-600">Create and manage your website navigation</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Menu
        </Button>
      </div>

      {menus.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <MenuIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No menus yet</h3>
            <p className="text-gray-500 mb-6">
              Create menus to add navigation to your website
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Menu
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Your Menus</h3>
            {menus.map((menu) => (
              <Card
                key={menu.id}
                className={`cursor-pointer transition-all ${
                  selectedMenu?.id === menu.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedMenu(menu)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{menu.name}</h4>
                      <p className="text-sm text-gray-500">
                        {LOCATIONS.find(l => l.value === menu.location)?.label}
                      </p>
                    </div>
                    <span className="text-sm text-gray-400">
                      {menu.items.length} items
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Menu Editor */}
          <div className="lg:col-span-2">
            {selectedMenu ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{selectedMenu.name}</CardTitle>
                    <CardDescription>
                      {LOCATIONS.find(l => l.value === selectedMenu.location)?.label}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMenu(selectedMenu.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={handleSaveMenu} disabled={saving}>
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Menu Items */}
                  <div className="space-y-2 mb-4">
                    {selectedMenu.items.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No menu items yet. Add your first item below.
                      </div>
                    ) : (
                      selectedMenu.items.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                            {getItemIcon(item.type)}
                            <div>
                              <p className="font-medium text-sm">{item.label}</p>
                              <p className="text-xs text-gray-500">
                                {item.type === 'page' && `Page: ${pages.find(p => p.id === item.pageId)?.slug || item.pageId}`}
                                {item.type === 'post' && `Post: ${posts.find(p => p.id === item.postId)?.slug || item.postId}`}
                                {(item.type === 'custom' || item.type === 'external') && item.url}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Item Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Menu Item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-8">
                <div className="text-center text-gray-500">
                  Select a menu to edit
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Create Menu Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Menu</DialogTitle>
            <DialogDescription>
              Create a navigation menu for your website
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Menu Name</Label>
              <Input
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
                placeholder="e.g., Main Navigation"
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={newMenuLocation}
                onValueChange={(value) => setNewMenuLocation(value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((loc) => (
                    <SelectItem key={loc.value} value={loc.value}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMenu}>Create Menu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
            <DialogDescription>
              Add a new item to your menu
            </DialogDescription>
          </DialogHeader>
          <Tabs value={newItemType} onValueChange={(v) => setNewItemType(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="page" className="flex-1">Page</TabsTrigger>
              <TabsTrigger value="post" className="flex-1">Post</TabsTrigger>
              <TabsTrigger value="custom" className="flex-1">Custom</TabsTrigger>
              <TabsTrigger value="external" className="flex-1">External</TabsTrigger>
            </TabsList>
            <div className="py-4 space-y-4">
              <TabsContent value="page">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Page</Label>
                    <Select value={newItemPageId} onValueChange={setNewItemPageId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a page" />
                      </SelectTrigger>
                      <SelectContent>
                        {pages.map((page) => (
                          <SelectItem key={page.id} value={page.id}>
                            {page.title} (/{page.slug})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Label (optional)</Label>
                    <Input
                      value={newItemLabel}
                      onChange={(e) => setNewItemLabel(e.target.value)}
                      placeholder="Leave empty to use page title"
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="post">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Post</Label>
                    <Select value={newItemPostId} onValueChange={setNewItemPostId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a post" />
                      </SelectTrigger>
                      <SelectContent>
                        {posts.map((post) => (
                          <SelectItem key={post.id} value={post.id}>
                            {post.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Label (optional)</Label>
                    <Input
                      value={newItemLabel}
                      onChange={(e) => setNewItemLabel(e.target.value)}
                      placeholder="Leave empty to use post title"
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="custom">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={newItemLabel}
                      onChange={(e) => setNewItemLabel(e.target.value)}
                      placeholder="Menu item label"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={newItemUrl}
                      onChange={(e) => setNewItemUrl(e.target.value)}
                      placeholder="/custom-path"
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="external">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={newItemLabel}
                      onChange={(e) => setNewItemLabel(e.target.value)}
                      placeholder="External Link"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={newItemUrl}
                      onChange={(e) => setNewItemUrl(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    External links will open in a new tab
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
