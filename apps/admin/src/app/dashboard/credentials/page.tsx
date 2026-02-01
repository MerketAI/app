'use client';

import { useEffect, useState } from 'react';
import { credentialsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { maskValue } from '@/lib/utils';
import {
  Key,
  Eye,
  EyeOff,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Check,
  X,
} from 'lucide-react';

interface Credential {
  id: string;
  key: string;
  maskedValue: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  updatedAt: string;
}

const CREDENTIAL_CATEGORIES = [
  { id: 'jasper', name: 'Jasper AI', icon: '🤖' },
  { id: 'meta', name: 'Meta (Facebook/Instagram)', icon: '📱' },
  { id: 'google', name: 'Google', icon: '🔍' },
  { id: 'razorpay', name: 'Razorpay', icon: '💳' },
  { id: 'other', name: 'Other', icon: '⚙️' },
];

const PREDEFINED_KEYS = {
  jasper: [
    { key: 'JASPER_API_KEY', description: 'Jasper AI API Key' },
    { key: 'JASPER_API_URL', description: 'Jasper AI API URL (optional)' },
  ],
  meta: [
    { key: 'META_APP_ID', description: 'Meta App ID' },
    { key: 'META_APP_SECRET', description: 'Meta App Secret' },
  ],
  google: [
    { key: 'GOOGLE_CLIENT_ID', description: 'Google OAuth Client ID' },
    { key: 'GOOGLE_CLIENT_SECRET', description: 'Google OAuth Client Secret' },
  ],
  razorpay: [
    { key: 'RAZORPAY_KEY_ID', description: 'Razorpay Key ID' },
    { key: 'RAZORPAY_KEY_SECRET', description: 'Razorpay Key Secret' },
    { key: 'RAZORPAY_WEBHOOK_SECRET', description: 'Razorpay Webhook Secret' },
  ],
};

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [showValue, setShowValue] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: '',
    category: 'other',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addCategory, setAddCategory] = useState('');

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      setIsLoading(true);
      const response = await credentialsApi.getAll();
      setCredentials(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await credentialsApi.create(formData);
      setFormData({ key: '', value: '', description: '', category: 'other' });
      setIsAdding(false);
      setAddCategory('');
      loadCredentials();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create credential');
    }
  };

  const handleUpdate = async (key: string, value: string) => {
    try {
      await credentialsApi.update(key, { value });
      setEditingKey(null);
      loadCredentials();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update credential');
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Are you sure you want to delete the credential "${key}"?`)) {
      return;
    }
    try {
      await credentialsApi.delete(key);
      loadCredentials();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete credential');
    }
  };

  const handleToggleActive = async (key: string, isActive: boolean) => {
    try {
      await credentialsApi.update(key, { isActive: !isActive });
      loadCredentials();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update credential');
    }
  };

  const handleClearCache = async () => {
    try {
      await credentialsApi.clearCache();
      alert('Cache cleared successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to clear cache');
    }
  };

  const getCredentialsByCategory = (category: string) => {
    return credentials.filter((c) => c.category === category || (!c.category && category === 'other'));
  };

  const getMissingKeys = (category: string) => {
    const existing = credentials.map((c) => c.key);
    const predefined = PREDEFINED_KEYS[category as keyof typeof PREDEFINED_KEYS] || [];
    return predefined.filter((p) => !existing.includes(p.key));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Credentials</h1>
          <p className="text-muted-foreground">
            Manage API keys and secrets for external services
          </p>
        </div>
        <Button variant="outline" onClick={handleClearCache}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Clear Cache
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Credential Categories */}
      {CREDENTIAL_CATEGORIES.map((category) => {
        const categoryCredentials = getCredentialsByCategory(category.id);
        const missingKeys = getMissingKeys(category.id);

        return (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{category.icon}</span>
                {category.name}
                <Badge variant="outline" className="ml-2">
                  {categoryCredentials.length} configured
                </Badge>
              </CardTitle>
              <CardDescription>
                {missingKeys.length > 0 && (
                  <span className="text-yellow-600">
                    {missingKeys.length} credential(s) not configured
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Credentials */}
              {categoryCredentials.map((credential) => (
                <div
                  key={credential.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono font-medium">
                        {credential.key}
                      </span>
                      {!credential.isActive && (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                    {credential.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {credential.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 text-sm">
                        {showValue[credential.key]
                          ? credential.maskedValue
                          : '••••••••••••'}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setShowValue((prev) => ({
                            ...prev,
                            [credential.key]: !prev[credential.key],
                          }))
                        }
                      >
                        {showValue[credential.key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingKey(credential.key);
                        setFormData({
                          key: credential.key,
                          value: '',
                          description: credential.description || '',
                          category: credential.category || 'other',
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleToggleActive(credential.key, credential.isActive)
                      }
                    >
                      {credential.isActive ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(credential.key)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Edit Form */}
              {editingKey &&
                categoryCredentials.some((c) => c.key === editingKey) && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdate(editingKey, formData.value);
                    }}
                    className="rounded-lg border border-primary p-4 space-y-4"
                  >
                    <div className="font-medium">
                      Update: {editingKey}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="value">New Value</Label>
                      <Input
                        id="value"
                        type="password"
                        value={formData.value}
                        onChange={(e) =>
                          setFormData({ ...formData, value: e.target.value })
                        }
                        placeholder="Enter new value"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">Update</Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingKey(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

              {/* Missing Keys Suggestions */}
              {missingKeys.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Missing credentials:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {missingKeys.map((missing) => (
                      <Button
                        key={missing.key}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsAdding(true);
                          setAddCategory(category.id);
                          setFormData({
                            key: missing.key,
                            value: '',
                            description: missing.description,
                            category: category.id,
                          });
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        {missing.key}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Form */}
              {isAdding && addCategory === category.id && (
                <form
                  onSubmit={handleCreate}
                  className="rounded-lg border border-primary p-4 space-y-4"
                >
                  <div className="font-medium">Add New Credential</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="key">Key</Label>
                      <Input
                        id="key"
                        value={formData.key}
                        onChange={(e) =>
                          setFormData({ ...formData, key: e.target.value })
                        }
                        placeholder="e.g., API_KEY"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="value">Value</Label>
                      <Input
                        id="value"
                        type="password"
                        value={formData.value}
                        onChange={(e) =>
                          setFormData({ ...formData, value: e.target.value })
                        }
                        placeholder="Enter secret value"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">Save Credential</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAdding(false);
                        setAddCategory('');
                        setFormData({
                          key: '',
                          value: '',
                          description: '',
                          category: 'other',
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {/* Add Custom Button */}
              {!isAdding && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAdding(true);
                    setAddCategory(category.id);
                    setFormData({
                      key: '',
                      value: '',
                      description: '',
                      category: category.id,
                    });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Custom Credential
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
