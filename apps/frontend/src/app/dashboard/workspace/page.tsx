'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, ExternalLink, Settings, Copy, Check, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { workspaceApi, uploadApi } from '@/lib/api';
import { toast } from 'sonner';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  favicon?: string;
  isPublished: boolean;
  url: string;
  createdAt: string;
}

export default function WorkspacePage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchWorkspace();
  }, []);

  const fetchWorkspace = async () => {
    try {
      const response = await workspaceApi.get();
      const ws = response.data.workspace;
      if (ws) {
        setWorkspace(ws);
        setName(ws.name);
        setSlug(ws.slug);
        setDescription(ws.description || '');
        setIsPublished(ws.isPublished);
        setLogo(ws.logo || null);
      } else {
        setShowCreateForm(true);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setShowCreateForm(true);
      } else {
        toast.error('Failed to load workspace');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkSlugAvailability = async (slugValue: string) => {
    if (slugValue.length < 3) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    try {
      const response = await workspaceApi.checkSlug(slugValue);
      setSlugAvailable(response.data.available);
    } catch {
      setSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSlugChange = (value: string) => {
    const normalizedSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    setSlug(normalizedSlug);
    checkSlugAvailability(normalizedSlug);
  };

  const handleCreate = async () => {
    if (!name || !slug) {
      toast.error('Name and slug are required');
      return;
    }

    setSaving(true);
    try {
      const response = await workspaceApi.create({ name, slug, description });
      setWorkspace(response.data.workspace);
      setShowCreateForm(false);
      toast.success('Workspace created successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create workspace');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const response = await workspaceApi.update({
        name,
        description,
        isPublished,
        logo: logo || undefined,
      });
      setWorkspace(response.data.workspace);
      toast.success('Workspace updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update workspace');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPEG, PNG, GIF, WebP, or SVG.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit.');
      return;
    }

    setUploadingLogo(true);
    try {
      const response = await uploadApi.uploadLogo(file);
      const uploadedUrl = response.data.url;
      setLogo(uploadedUrl);

      // Auto-save logo to workspace
      await workspaceApi.update({ logo: uploadedUrl });
      toast.success('Logo uploaded successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload logo. Please check AWS credentials in admin panel.');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await workspaceApi.update({ logo: '' });
      setLogo(null);
      toast.success('Logo removed successfully!');
    } catch (error: any) {
      toast.error('Failed to remove logo');
    }
  };

  const copyUrl = () => {
    if (workspace) {
      navigator.clipboard.writeText(`https://${workspace.url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('URL copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showCreateForm && !workspace) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Your Workspace</h1>
          <p className="text-gray-600 mt-2">
            Set up your workspace to start building your website with AI.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Workspace Details
            </CardTitle>
            <CardDescription>
              Your workspace will be accessible at your-slug.jeeper.app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Business"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Subdomain</Label>
              <div className="flex items-center">
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="my-business"
                  className="rounded-r-none"
                />
                <span className="px-3 py-2 bg-gray-100 border border-l-0 rounded-r-md text-gray-500 text-sm">
                  .jeeper.app
                </span>
              </div>
              {checkingSlug && (
                <p className="text-sm text-gray-500">Checking availability...</p>
              )}
              {slugAvailable === true && (
                <p className="text-sm text-green-600">This subdomain is available!</p>
              )}
              {slugAvailable === false && (
                <p className="text-sm text-red-600">This subdomain is already taken.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your business or website"
                rows={3}
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={saving || !name || !slug || slugAvailable === false}
              className="w-full"
            >
              {saving ? 'Creating...' : 'Create Workspace'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workspace</h1>
          <p className="text-gray-600">Manage your website workspace settings</p>
        </div>
        {workspace && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center px-3 py-2 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600 mr-2">https://{workspace.url}</span>
              <button onClick={copyUrl} className="text-gray-400 hover:text-gray-600">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <Button
              variant="outline"
              onClick={() => window.open(`https://${workspace.url}`, '_blank')}
              disabled={!workspace.isPublished}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Site
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic information about your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Workspace Logo</Label>
                <div className="flex items-start space-x-4">
                  <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                    {logo ? (
                      <>
                        <img
                          src={logo}
                          alt="Workspace logo"
                          className="w-full h-full object-contain"
                        />
                        <button
                          onClick={handleRemoveLogo}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          title="Remove logo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="mb-2"
                    >
                      {uploadingLogo ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {logo ? 'Change Logo' : 'Upload Logo'}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500">
                      Recommended: Square image, max 5MB. Supports JPEG, PNG, GIF, WebP, SVG.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ws-name">Workspace Name</Label>
                <Input
                  id="ws-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ws-slug">Subdomain</Label>
                <div className="flex items-center">
                  <Input
                    id="ws-slug"
                    value={slug}
                    disabled
                    className="rounded-r-none bg-gray-50"
                  />
                  <span className="px-3 py-2 bg-gray-100 border border-l-0 rounded-r-md text-gray-500 text-sm">
                    .jeeper.app
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Subdomain cannot be changed after creation
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ws-description">Description</Label>
                <Textarea
                  id="ws-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <Button onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
              <CardDescription>Control the visibility of your website</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Publish Website</p>
                  <p className="text-sm text-gray-500">
                    Make your website publicly accessible
                  </p>
                </div>
                <Switch
                  checked={isPublished}
                  onCheckedChange={(checked) => {
                    setIsPublished(checked);
                  }}
                />
              </div>
              {isPublished && (
                <p className="mt-4 text-sm text-green-600">
                  Your website is live at https://{workspace?.url}
                </p>
              )}
              {!isPublished && (
                <p className="mt-4 text-sm text-gray-500">
                  Your website is currently private. Publish it to make it accessible to visitors.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push('/dashboard/workspace/pages/new')}
              >
                <Globe className="w-4 h-4 mr-2" />
                Create New Page
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push('/dashboard/workspace/posts/new')}
              >
                <Globe className="w-4 h-4 mr-2" />
                Create New Post
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push('/dashboard/workspace/menus')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Menus
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Pages</span>
                <span className="font-medium">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Posts</span>
                <span className="font-medium">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span
                  className={`text-sm font-medium ${
                    isPublished ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  {isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
