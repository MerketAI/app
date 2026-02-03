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
import { Plus, Pencil, Trash2, Briefcase, X, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { AiFetchButton } from '@/components/ai-fetch';

interface Service {
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
  pricingUnit?: string;
  duration?: string;
  deliverables: string[];
  process: string[];
  requirements: string[];
  benefits: string[];
  targetMarket?: string;
  idealClient?: string;
  keywords: string[];
  isActive: boolean;
  isFeatured: boolean;
}

const emptyService: Partial<Service> = {
  name: '',
  description: '',
  shortDescription: '',
  category: '',
  priceType: 'FIXED',
  currency: 'USD',
  deliverables: [],
  process: [],
  requirements: [],
  benefits: [],
  keywords: [],
  isActive: true,
  isFeatured: false,
};

const priceTypes = [
  { value: 'FIXED', label: 'Fixed Price' },
  { value: 'HOURLY', label: 'Hourly Rate' },
  { value: 'RANGE', label: 'Price Range' },
  { value: 'CUSTOM', label: 'Custom/Quote' },
  { value: 'RETAINER', label: 'Monthly Retainer' },
];

const pricingUnits = [
  'Per Hour', 'Per Day', 'Per Project', 'Per Month', 'Per Session', 'Per Word', 'Per Page'
];

const durations = [
  '1 hour', '2-3 hours', 'Half day', 'Full day', '1 week', '2 weeks', '1 month', '2-3 months', 'Ongoing'
];

const serviceCategories = [
  'Consulting', 'Marketing', 'Development', 'Design', 'Writing', 'Support',
  'Training', 'Strategy', 'Management', 'Analytics', 'Other'
];

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [saving, setSaving] = useState(false);

  // Input states for array fields
  const [deliverableInput, setDeliverableInput] = useState('');
  const [processInput, setProcessInput] = useState('');
  const [requirementInput, setRequirementInput] = useState('');
  const [benefitInput, setBenefitInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await businessApi.getServices();
      setServices(response.data);
    } catch (error) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingService({ ...emptyService });
    setShowForm(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService({ ...service });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await businessApi.deleteService(id);
      toast.success('Service deleted');
      fetchServices();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const handleSave = async () => {
    if (!editingService?.name) {
      toast.error('Service name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingService.id) {
        await businessApi.updateService(editingService.id, editingService);
        toast.success('Service updated');
      } else {
        await businessApi.createService(editingService);
        toast.success('Service created');
      }
      setShowForm(false);
      setEditingService(null);
      fetchServices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const addToArray = (field: keyof Service, value: string, setValue: (v: string) => void) => {
    if (value.trim() && editingService) {
      const current = (editingService[field] as string[]) || [];
      setEditingService({
        ...editingService,
        [field]: [...current, value.trim()],
      });
      setValue('');
    }
  };

  const removeFromArray = (field: keyof Service, index: number) => {
    if (editingService) {
      const current = (editingService[field] as string[]) || [];
      setEditingService({
        ...editingService,
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

  if (showForm && editingService) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {editingService.id ? 'Edit Service' : 'Add New Service'}
          </h2>
          <Button variant="ghost" onClick={() => { setShowForm(false); setEditingService(null); }}>
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
                <Label>Service Name *</Label>
                <Input
                  value={editingService.name || ''}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  placeholder="e.g., Social Media Management"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  value={editingService.category || ''}
                  onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select category</option>
                  {serviceCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Short Description</Label>
              <Input
                value={editingService.shortDescription || ''}
                onChange={(e) => setEditingService({ ...editingService, shortDescription: e.target.value })}
                placeholder="One-line service description"
              />
            </div>

            <div className="space-y-2">
              <Label>Full Description</Label>
              <Textarea
                value={editingService.description || ''}
                onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                placeholder="Detailed service description..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing & Duration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Price Type</Label>
                <select
                  value={editingService.priceType || 'FIXED'}
                  onChange={(e) => setEditingService({ ...editingService, priceType: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {priceTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {(editingService.priceType === 'FIXED' || editingService.priceType === 'HOURLY' || editingService.priceType === 'RETAINER') && (
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={editingService.price || ''}
                    onChange={(e) => setEditingService({ ...editingService, price: parseFloat(e.target.value) })}
                    placeholder="99.99"
                  />
                </div>
              )}

              {editingService.priceType === 'RANGE' && (
                <>
                  <div className="space-y-2">
                    <Label>Min Price</Label>
                    <Input
                      type="number"
                      value={editingService.priceMin || ''}
                      onChange={(e) => setEditingService({ ...editingService, priceMin: parseFloat(e.target.value) })}
                      placeholder="500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Price</Label>
                    <Input
                      type="number"
                      value={editingService.priceMax || ''}
                      onChange={(e) => setEditingService({ ...editingService, priceMax: parseFloat(e.target.value) })}
                      placeholder="5000"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Pricing Unit</Label>
                <select
                  value={editingService.pricingUnit || ''}
                  onChange={(e) => setEditingService({ ...editingService, pricingUnit: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select unit</option>
                  {pricingUnits.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Typical Duration
              </Label>
              <select
                value={editingService.duration || ''}
                onChange={(e) => setEditingService({ ...editingService, duration: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select duration</option>
                {durations.map((dur) => (
                  <option key={dur} value={dur}>{dur}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Deliverables & Process
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Deliverables (What the client gets)</Label>
              <div className="flex gap-2">
                <Input
                  value={deliverableInput}
                  onChange={(e) => setDeliverableInput(e.target.value)}
                  placeholder="Add a deliverable..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('deliverables', deliverableInput, setDeliverableInput))}
                />
                <Button type="button" onClick={() => addToArray('deliverables', deliverableInput, setDeliverableInput)}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(editingService.deliverables || []).map((item, i) => (
                  <Badge key={i} variant="default" className="gap-1">
                    {item}
                    <button onClick={() => removeFromArray('deliverables', i)} className="ml-1">×</button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Service Process (Steps)</Label>
              <div className="flex gap-2">
                <Input
                  value={processInput}
                  onChange={(e) => setProcessInput(e.target.value)}
                  placeholder="Add a process step..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('process', processInput, setProcessInput))}
                />
                <Button type="button" onClick={() => addToArray('process', processInput, setProcessInput)}>Add</Button>
              </div>
              <div className="space-y-1">
                {(editingService.process || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">
                      {i + 1}
                    </span>
                    <span className="flex-1">{item}</span>
                    <button onClick={() => removeFromArray('process', i)} className="text-gray-400 hover:text-red-500">×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Requirements (What client needs to provide)</Label>
              <div className="flex gap-2">
                <Input
                  value={requirementInput}
                  onChange={(e) => setRequirementInput(e.target.value)}
                  placeholder="Add a requirement..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('requirements', requirementInput, setRequirementInput))}
                />
                <Button type="button" onClick={() => addToArray('requirements', requirementInput, setRequirementInput)}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(editingService.requirements || []).map((item, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    {item}
                    <button onClick={() => removeFromArray('requirements', i)} className="ml-1">×</button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Benefits & Target Market</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                {(editingService.benefits || []).map((item, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {item}
                    <button onClick={() => removeFromArray('benefits', i)} className="ml-1">×</button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Market</Label>
                <Input
                  value={editingService.targetMarket || ''}
                  onChange={(e) => setEditingService({ ...editingService, targetMarket: e.target.value })}
                  placeholder="e.g., Small businesses, Startups"
                />
              </div>
              <div className="space-y-2">
                <Label>Ideal Client</Label>
                <Input
                  value={editingService.idealClient || ''}
                  onChange={(e) => setEditingService({ ...editingService, idealClient: e.target.value })}
                  placeholder="e.g., E-commerce businesses looking to scale"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO & Status</CardTitle>
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
                {(editingService.keywords || []).map((item, i) => (
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
                  checked={editingService.isActive ?? true}
                  onChange={(e) => setEditingService({ ...editingService, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingService.isFeatured ?? false}
                  onChange={(e) => setEditingService({ ...editingService, isFeatured: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Featured Service</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => { setShowForm(false); setEditingService(null); }}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (editingService.id ? 'Update Service' : 'Create Service')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Services</h2>
          <p className="text-sm text-gray-500">Manage your service offerings for better content generation</p>
        </div>
        <div className="flex gap-2">
          <AiFetchButton
            type="service"
            onDataFetched={(data) => {
              if (Array.isArray(data) && data.length > 0) {
                const service = data[0];
                const newService: Partial<Service> = {
                  ...emptyService,
                  name: service.name || '',
                  description: service.description || '',
                  category: service.category || '',
                  deliverables: service.deliverables || [],
                  benefits: service.benefits || [],
                  targetMarket: service.targetMarket || '',
                  duration: service.duration || '',
                };
                setEditingService(newService);
                setShowForm(true);
                toast.info(`${data.length} service suggestions loaded. Showing first one.`);
              }
            }}
            buttonText="Suggest Services with AI"
          />
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Service
          </Button>
        </div>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No services yet</h3>
            <p className="text-gray-500 mb-4">
              Add your services to generate better targeted content
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" /> Add Your First Service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <Card key={service.id} className={!service.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {service.name}
                      {service.isFeatured && <Badge>Featured</Badge>}
                    </CardTitle>
                    {service.category && (
                      <CardDescription>{service.category}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(service)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(service.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {service.shortDescription && (
                  <p className="text-sm text-gray-600 mb-3">{service.shortDescription}</p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">
                    {service.priceType === 'CUSTOM' && 'Custom Pricing'}
                    {service.priceType === 'FIXED' && service.price && `$${service.price}`}
                    {service.priceType === 'HOURLY' && service.price && `$${service.price}/hr`}
                    {service.priceType === 'RETAINER' && service.price && `$${service.price}/mo`}
                    {service.priceType === 'RANGE' && `$${service.priceMin} - $${service.priceMax}`}
                  </span>
                  {service.duration && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {service.duration}
                    </Badge>
                  )}
                </div>
                {service.deliverables.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {service.deliverables.slice(0, 3).map((d, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
                    ))}
                    {service.deliverables.length > 3 && (
                      <Badge variant="secondary" className="text-xs">+{service.deliverables.length - 3} more</Badge>
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
