'use client';

import { useEffect, useState } from 'react';
import { businessApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package, X, DollarSign, Tag } from 'lucide-react';
import { AiFetchButton } from '@/components/ai-fetch';

interface Product {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  priceType: string;
  price?: number;
  priceMin?: number;
  priceMax?: number;
  currency: string;
  pricingModel?: string;
  features: string[];
  benefits: string[];
  targetMarket?: string;
  idealCustomer?: string;
  useCases: string[];
  differentiators: string[];
  keywords: string[];
  isActive: boolean;
  isFeatured: boolean;
}

const emptyProduct: Partial<Product> = {
  name: '',
  description: '',
  shortDescription: '',
  category: '',
  priceType: 'FIXED',
  currency: 'USD',
  features: [],
  benefits: [],
  useCases: [],
  differentiators: [],
  keywords: [],
  isActive: true,
  isFeatured: false,
};

const priceTypes = [
  { value: 'FIXED', label: 'Fixed Price' },
  { value: 'RANGE', label: 'Price Range' },
  { value: 'CUSTOM', label: 'Custom/Quote' },
  { value: 'FREE', label: 'Free' },
];

const pricingModels = [
  'One-time', 'Subscription', 'Per-user', 'Usage-based', 'Tiered', 'Freemium'
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);

  // Input states for array fields
  const [featureInput, setFeatureInput] = useState('');
  const [benefitInput, setBenefitInput] = useState('');
  const [useCaseInput, setUseCaseInput] = useState('');
  const [differentiatorInput, setDifferentiatorInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await businessApi.getProducts();
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProduct({ ...emptyProduct });
    setShowForm(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await businessApi.deleteProduct(id);
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleSave = async () => {
    if (!editingProduct?.name) {
      toast.error('Product name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingProduct.id) {
        await businessApi.updateProduct(editingProduct.id, editingProduct);
        toast.success('Product updated');
      } else {
        await businessApi.createProduct(editingProduct);
        toast.success('Product created');
      }
      setShowForm(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const addToArray = (field: keyof Product, value: string, setValue: (v: string) => void) => {
    if (value.trim() && editingProduct) {
      const current = (editingProduct[field] as string[]) || [];
      setEditingProduct({
        ...editingProduct,
        [field]: [...current, value.trim()],
      });
      setValue('');
    }
  };

  const removeFromArray = (field: keyof Product, index: number) => {
    if (editingProduct) {
      const current = (editingProduct[field] as string[]) || [];
      setEditingProduct({
        ...editingProduct,
        [field]: current.filter((_, i) => i !== index),
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showForm && editingProduct) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {editingProduct.id ? 'Edit Product' : 'Add New Product'}
          </h2>
          <Button variant="ghost" onClick={() => { setShowForm(false); setEditingProduct(null); }}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="e.g., Marketing Pro Suite"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={editingProduct.category || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  placeholder="e.g., Software, SaaS"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Short Description</Label>
              <Input
                value={editingProduct.shortDescription || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, shortDescription: e.target.value })}
                placeholder="One-line description for listings"
              />
            </div>

            <div className="space-y-2">
              <Label>Full Description</Label>
              <Textarea
                value={editingProduct.description || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                placeholder="Detailed product description..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Price Type</Label>
                <select
                  value={editingProduct.priceType || 'FIXED'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, priceType: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {priceTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {editingProduct.priceType === 'FIXED' && (
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={editingProduct.price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                    placeholder="99.99"
                  />
                </div>
              )}

              {editingProduct.priceType === 'RANGE' && (
                <>
                  <div className="space-y-2">
                    <Label>Min Price</Label>
                    <Input
                      type="number"
                      value={editingProduct.priceMin || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, priceMin: parseFloat(e.target.value) })}
                      placeholder="49.99"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Price</Label>
                    <Input
                      type="number"
                      value={editingProduct.priceMax || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, priceMax: parseFloat(e.target.value) })}
                      placeholder="199.99"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Pricing Model</Label>
                <select
                  value={editingProduct.pricingModel || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, pricingModel: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select model</option>
                  {pricingModels.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features & Benefits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Features</Label>
              <div className="flex gap-2">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  placeholder="Add a feature..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('features', featureInput, setFeatureInput))}
                />
                <Button type="button" onClick={() => addToArray('features', featureInput, setFeatureInput)}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(editingProduct.features || []).map((item, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {item}
                    <button onClick={() => removeFromArray('features', i)} className="ml-1">×</button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Benefits</Label>
              <div className="flex gap-2">
                <Input
                  value={benefitInput}
                  onChange={(e) => setBenefitInput(e.target.value)}
                  placeholder="Add a benefit..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('benefits', benefitInput, setBenefitInput))}
                />
                <Button type="button" onClick={() => addToArray('benefits', benefitInput, setBenefitInput)}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(editingProduct.benefits || []).map((item, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    {item}
                    <button onClick={() => removeFromArray('benefits', i)} className="ml-1">×</button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Differentiators (What makes this unique)</Label>
              <div className="flex gap-2">
                <Input
                  value={differentiatorInput}
                  onChange={(e) => setDifferentiatorInput(e.target.value)}
                  placeholder="Add a differentiator..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('differentiators', differentiatorInput, setDifferentiatorInput))}
                />
                <Button type="button" onClick={() => addToArray('differentiators', differentiatorInput, setDifferentiatorInput)}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(editingProduct.differentiators || []).map((item, i) => (
                  <Badge key={i} variant="default" className="gap-1">
                    {item}
                    <button onClick={() => removeFromArray('differentiators', i)} className="ml-1">×</button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Target Market</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Market</Label>
                <Input
                  value={editingProduct.targetMarket || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, targetMarket: e.target.value })}
                  placeholder="e.g., Small businesses, Enterprise"
                />
              </div>
              <div className="space-y-2">
                <Label>Ideal Customer</Label>
                <Input
                  value={editingProduct.idealCustomer || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, idealCustomer: e.target.value })}
                  placeholder="e.g., Marketing managers at SaaS companies"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Use Cases</Label>
              <div className="flex gap-2">
                <Input
                  value={useCaseInput}
                  onChange={(e) => setUseCaseInput(e.target.value)}
                  placeholder="Add a use case..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('useCases', useCaseInput, setUseCaseInput))}
                />
                <Button type="button" onClick={() => addToArray('useCases', useCaseInput, setUseCaseInput)}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(editingProduct.useCases || []).map((item, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {item}
                    <button onClick={() => removeFromArray('useCases', i)} className="ml-1">×</button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              SEO & Marketing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Keywords (for content generation)</Label>
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Add a keyword..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('keywords', keywordInput, setKeywordInput))}
                />
                <Button type="button" onClick={() => addToArray('keywords', keywordInput, setKeywordInput)}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(editingProduct.keywords || []).map((item, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    #{item}
                    <button onClick={() => removeFromArray('keywords', i)} className="ml-1">×</button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingProduct.isActive ?? true}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingProduct.isFeatured ?? false}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Featured Product</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => { setShowForm(false); setEditingProduct(null); }}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (editingProduct.id ? 'Update Product' : 'Create Product')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Products</h2>
          <p className="text-sm text-gray-500">Manage your product catalog for better content generation</p>
        </div>
        <div className="flex gap-2">
          <AiFetchButton
            type="product"
            onDataFetched={(data) => {
              // If array of products, show them for selection
              if (Array.isArray(data) && data.length > 0) {
                const product = data[0]; // Use first suggestion
                const newProduct: Partial<Product> = {
                  ...emptyProduct,
                  name: product.name || '',
                  description: product.description || '',
                  category: product.category || '',
                  features: product.features || [],
                  benefits: product.benefits || [],
                  targetMarket: product.targetMarket || '',
                  differentiators: product.differentiators || [],
                };
                setEditingProduct(newProduct);
                setShowForm(true);
                toast.info(`${data.length} product suggestions loaded. Showing first one.`);
              }
            }}
            buttonText="Suggest Products with AI"
          />
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-500 mb-4">
              Add your products to generate better targeted content
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" /> Add Your First Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((product) => (
            <Card key={product.id} className={!product.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {product.name}
                      {product.isFeatured && <Badge>Featured</Badge>}
                    </CardTitle>
                    {product.category && (
                      <CardDescription>{product.category}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {product.shortDescription && (
                  <p className="text-sm text-gray-600 mb-3">{product.shortDescription}</p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">
                    {product.priceType === 'FREE' && 'Free'}
                    {product.priceType === 'FIXED' && product.price && `$${product.price}`}
                    {product.priceType === 'RANGE' && `$${product.priceMin} - $${product.priceMax}`}
                    {product.priceType === 'CUSTOM' && 'Custom Pricing'}
                  </span>
                  {product.pricingModel && (
                    <Badge variant="outline">{product.pricingModel}</Badge>
                  )}
                </div>
                {product.features.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {product.features.slice(0, 3).map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                    ))}
                    {product.features.length > 3 && (
                      <Badge variant="secondary" className="text-xs">+{product.features.length - 3} more</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
