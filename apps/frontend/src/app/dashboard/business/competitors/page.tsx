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
import {
  Plus, Pencil, Trash2, Target, X, Globe, DollarSign,
  TrendingUp, TrendingDown, AlertTriangle, Lightbulb,
  Facebook, Instagram, Linkedin, Twitter, Youtube
} from 'lucide-react';
import { AiFetchButton } from '@/components/ai-fetch';

interface Competitor {
  id: string;
  name: string;
  website?: string;
  description?: string;
  industry?: string;
  size?: string;
  founded?: string;
  headquarters?: string;
  // Social Presence
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  // SWOT
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  // Market Position
  marketShare?: string;
  pricePosition?: string;
  targetAudience?: string;
  // Products & Offerings
  products: string[];
  services: string[];
  uniqueFeatures: string[];
  // Ad Intelligence
  adPlatforms: string[];
  adStrategies: string[];
  adBudgetEstimate?: string;
  topPerformingAds?: string;
  // Content Strategy
  contentTypes: string[];
  postingFrequency?: string;
  engagementLevel?: string;
  // Notes
  notes?: string;
  isActive: boolean;
  threatLevel?: string;
}

const emptyCompetitor: Partial<Competitor> = {
  name: '',
  website: '',
  description: '',
  strengths: [],
  weaknesses: [],
  opportunities: [],
  threats: [],
  products: [],
  services: [],
  uniqueFeatures: [],
  adPlatforms: [],
  adStrategies: [],
  contentTypes: [],
  isActive: true,
  threatLevel: 'MEDIUM',
};

const companySizes = [
  'Startup (1-10)', 'Small (11-50)', 'Medium (51-200)',
  'Large (201-1000)', 'Enterprise (1000+)'
];

const pricePositions = [
  'Budget/Low-cost', 'Value', 'Mid-market', 'Premium', 'Luxury'
];

const threatLevels = [
  { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-red-100 text-red-800' },
];

const adPlatformOptions = [
  'Google Ads', 'Facebook Ads', 'Instagram Ads', 'LinkedIn Ads',
  'Twitter/X Ads', 'TikTok Ads', 'YouTube Ads', 'Reddit Ads',
  'Pinterest Ads', 'Programmatic Display', 'Native Ads'
];

const contentTypeOptions = [
  'Blog Posts', 'Video Content', 'Podcasts', 'Infographics',
  'Case Studies', 'Whitepapers', 'Webinars', 'Social Posts',
  'Email Newsletters', 'User Generated Content'
];

const engagementLevels = [
  'Very Low', 'Low', 'Moderate', 'High', 'Very High'
];

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Partial<Competitor> | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Input states for array fields
  const [strengthInput, setStrengthInput] = useState('');
  const [weaknessInput, setWeaknessInput] = useState('');
  const [opportunityInput, setOpportunityInput] = useState('');
  const [threatInput, setThreatInput] = useState('');
  const [productInput, setProductInput] = useState('');
  const [serviceInput, setServiceInput] = useState('');
  const [featureInput, setFeatureInput] = useState('');
  const [strategyInput, setStrategyInput] = useState('');

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const fetchCompetitors = async () => {
    try {
      const response = await businessApi.getCompetitors();
      setCompetitors(response.data);
    } catch (error) {
      toast.error('Failed to load competitors');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCompetitor({ ...emptyCompetitor });
    setActiveTab('basic');
    setShowForm(true);
  };

  const handleEdit = (competitor: Competitor) => {
    setEditingCompetitor({ ...competitor });
    setActiveTab('basic');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this competitor?')) return;
    try {
      await businessApi.deleteCompetitor(id);
      toast.success('Competitor deleted');
      fetchCompetitors();
    } catch (error) {
      toast.error('Failed to delete competitor');
    }
  };

  const handleSave = async () => {
    if (!editingCompetitor?.name) {
      toast.error('Competitor name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingCompetitor.id) {
        await businessApi.updateCompetitor(editingCompetitor.id, editingCompetitor);
        toast.success('Competitor updated');
      } else {
        await businessApi.createCompetitor(editingCompetitor);
        toast.success('Competitor added');
      }
      setShowForm(false);
      setEditingCompetitor(null);
      fetchCompetitors();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save competitor');
    } finally {
      setSaving(false);
    }
  };

  const addToArray = (field: keyof Competitor, value: string, setValue: (v: string) => void) => {
    if (value.trim() && editingCompetitor) {
      const current = (editingCompetitor[field] as string[]) || [];
      setEditingCompetitor({
        ...editingCompetitor,
        [field]: [...current, value.trim()],
      });
      setValue('');
    }
  };

  const removeFromArray = (field: keyof Competitor, index: number) => {
    if (editingCompetitor) {
      const current = (editingCompetitor[field] as string[]) || [];
      setEditingCompetitor({
        ...editingCompetitor,
        [field]: current.filter((_, i) => i !== index),
      });
    }
  };

  const toggleArrayItem = (field: keyof Competitor, value: string) => {
    if (editingCompetitor) {
      const current = (editingCompetitor[field] as string[]) || [];
      if (current.includes(value)) {
        setEditingCompetitor({
          ...editingCompetitor,
          [field]: current.filter(v => v !== value),
        });
      } else {
        setEditingCompetitor({
          ...editingCompetitor,
          [field]: [...current, value],
        });
      }
    }
  };

  const getThreatBadge = (level?: string) => {
    const threat = threatLevels.find(t => t.value === level) || threatLevels[1];
    return <Badge className={threat.color}>{threat.label} Threat</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showForm && editingCompetitor) {
    const tabs = [
      { id: 'basic', label: 'Basic Info' },
      { id: 'social', label: 'Social Media' },
      { id: 'swot', label: 'SWOT Analysis' },
      { id: 'market', label: 'Market Position' },
      { id: 'ads', label: 'Ad Intelligence' },
      { id: 'content', label: 'Content Strategy' },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {editingCompetitor.id ? 'Edit Competitor' : 'Add Competitor'}
          </h2>
          <Button variant="ghost" onClick={() => { setShowForm(false); setEditingCompetitor(null); }}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Competitor Name *</Label>
                  <Input
                    value={editingCompetitor.name || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, name: e.target.value })}
                    placeholder="e.g., Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={editingCompetitor.website || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, website: e.target.value })}
                    placeholder="https://competitor.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingCompetitor.description || ''}
                  onChange={(e) => setEditingCompetitor({ ...editingCompetitor, description: e.target.value })}
                  placeholder="Brief description of this competitor..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input
                    value={editingCompetitor.industry || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, industry: e.target.value })}
                    placeholder="e.g., SaaS, Marketing"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Size</Label>
                  <select
                    value={editingCompetitor.size || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, size: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select size</option>
                    {companySizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Threat Level</Label>
                  <select
                    value={editingCompetitor.threatLevel || 'MEDIUM'}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, threatLevel: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {threatLevels.map((level) => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Founded Year</Label>
                  <Input
                    value={editingCompetitor.founded || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, founded: e.target.value })}
                    placeholder="e.g., 2015"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Headquarters</Label>
                  <Input
                    value={editingCompetitor.headquarters || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, headquarters: e.target.value })}
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Social Media Tab */}
        {activeTab === 'social' && (
          <Card>
            <CardHeader>
              <CardTitle>Social Media Presence</CardTitle>
              <CardDescription>Track competitor's social media accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-blue-600" /> Facebook
                  </Label>
                  <Input
                    value={editingCompetitor.facebookUrl || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, facebookUrl: e.target.value })}
                    placeholder="https://facebook.com/competitor"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-600" /> Instagram
                  </Label>
                  <Input
                    value={editingCompetitor.instagramUrl || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, instagramUrl: e.target.value })}
                    placeholder="https://instagram.com/competitor"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-blue-700" /> LinkedIn
                  </Label>
                  <Input
                    value={editingCompetitor.linkedinUrl || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/company/competitor"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-blue-400" /> Twitter/X
                  </Label>
                  <Input
                    value={editingCompetitor.twitterUrl || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, twitterUrl: e.target.value })}
                    placeholder="https://twitter.com/competitor"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-600" /> YouTube
                  </Label>
                  <Input
                    value={editingCompetitor.youtubeUrl || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, youtubeUrl: e.target.value })}
                    placeholder="https://youtube.com/@competitor"
                  />
                </div>
                <div className="space-y-2">
                  <Label>TikTok</Label>
                  <Input
                    value={editingCompetitor.tiktokUrl || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, tiktokUrl: e.target.value })}
                    placeholder="https://tiktok.com/@competitor"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SWOT Analysis Tab */}
        {activeTab === 'swot' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-green-700 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={strengthInput}
                    onChange={(e) => setStrengthInput(e.target.value)}
                    placeholder="Add strength..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('strengths', strengthInput, setStrengthInput))}
                  />
                  <Button size="sm" onClick={() => addToArray('strengths', strengthInput, setStrengthInput)}>Add</Button>
                </div>
                <div className="space-y-1">
                  {(editingCompetitor.strengths || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm">
                      <span className="flex-1">{item}</span>
                      <button onClick={() => removeFromArray('strengths', i)} className="text-gray-400 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" /> Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={weaknessInput}
                    onChange={(e) => setWeaknessInput(e.target.value)}
                    placeholder="Add weakness..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('weaknesses', weaknessInput, setWeaknessInput))}
                  />
                  <Button size="sm" onClick={() => addToArray('weaknesses', weaknessInput, setWeaknessInput)}>Add</Button>
                </div>
                <div className="space-y-1">
                  {(editingCompetitor.weaknesses || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-red-50 rounded text-sm">
                      <span className="flex-1">{item}</span>
                      <button onClick={() => removeFromArray('weaknesses', i)} className="text-gray-400 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-blue-700 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" /> Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={opportunityInput}
                    onChange={(e) => setOpportunityInput(e.target.value)}
                    placeholder="Add opportunity..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('opportunities', opportunityInput, setOpportunityInput))}
                  />
                  <Button size="sm" onClick={() => addToArray('opportunities', opportunityInput, setOpportunityInput)}>Add</Button>
                </div>
                <div className="space-y-1">
                  {(editingCompetitor.opportunities || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm">
                      <span className="flex-1">{item}</span>
                      <button onClick={() => removeFromArray('opportunities', i)} className="text-gray-400 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-orange-700 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Threats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={threatInput}
                    onChange={(e) => setThreatInput(e.target.value)}
                    placeholder="Add threat..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('threats', threatInput, setThreatInput))}
                  />
                  <Button size="sm" onClick={() => addToArray('threats', threatInput, setThreatInput)}>Add</Button>
                </div>
                <div className="space-y-1">
                  {(editingCompetitor.threats || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-orange-50 rounded text-sm">
                      <span className="flex-1">{item}</span>
                      <button onClick={() => removeFromArray('threats', i)} className="text-gray-400 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Market Position Tab */}
        {activeTab === 'market' && (
          <Card>
            <CardHeader>
              <CardTitle>Market Position & Offerings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Market Share</Label>
                  <Input
                    value={editingCompetitor.marketShare || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, marketShare: e.target.value })}
                    placeholder="e.g., 15%, Leader, Emerging"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price Position</Label>
                  <select
                    value={editingCompetitor.pricePosition || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, pricePosition: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select position</option>
                    {pricePositions.map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Input
                    value={editingCompetitor.targetAudience || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, targetAudience: e.target.value })}
                    placeholder="e.g., SMBs, Enterprise"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Products</Label>
                <div className="flex gap-2">
                  <Input
                    value={productInput}
                    onChange={(e) => setProductInput(e.target.value)}
                    placeholder="Add product..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('products', productInput, setProductInput))}
                  />
                  <Button onClick={() => addToArray('products', productInput, setProductInput)}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editingCompetitor.products || []).map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {item}
                      <button onClick={() => removeFromArray('products', i)}>×</button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Services</Label>
                <div className="flex gap-2">
                  <Input
                    value={serviceInput}
                    onChange={(e) => setServiceInput(e.target.value)}
                    placeholder="Add service..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('services', serviceInput, setServiceInput))}
                  />
                  <Button onClick={() => addToArray('services', serviceInput, setServiceInput)}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editingCompetitor.services || []).map((item, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {item}
                      <button onClick={() => removeFromArray('services', i)}>×</button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Unique Features / USPs</Label>
                <div className="flex gap-2">
                  <Input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    placeholder="Add unique feature..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('uniqueFeatures', featureInput, setFeatureInput))}
                  />
                  <Button onClick={() => addToArray('uniqueFeatures', featureInput, setFeatureInput)}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editingCompetitor.uniqueFeatures || []).map((item, i) => (
                    <Badge key={i} className="gap-1">
                      {item}
                      <button onClick={() => removeFromArray('uniqueFeatures', i)}>×</button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ad Intelligence Tab */}
        {activeTab === 'ads' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Advertising Intelligence
              </CardTitle>
              <CardDescription>Track competitor advertising strategies and performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ad Platforms Used</Label>
                <div className="flex flex-wrap gap-2">
                  {adPlatformOptions.map((platform) => (
                    <Badge
                      key={platform}
                      variant={(editingCompetitor.adPlatforms || []).includes(platform) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('adPlatforms', platform)}
                    >
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estimated Ad Budget</Label>
                <Input
                  value={editingCompetitor.adBudgetEstimate || ''}
                  onChange={(e) => setEditingCompetitor({ ...editingCompetitor, adBudgetEstimate: e.target.value })}
                  placeholder="e.g., $10K-50K/month, High spend"
                />
              </div>

              <div className="space-y-2">
                <Label>Ad Strategies Observed</Label>
                <div className="flex gap-2">
                  <Input
                    value={strategyInput}
                    onChange={(e) => setStrategyInput(e.target.value)}
                    placeholder="Add strategy..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('adStrategies', strategyInput, setStrategyInput))}
                  />
                  <Button onClick={() => addToArray('adStrategies', strategyInput, setStrategyInput)}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editingCompetitor.adStrategies || []).map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {item}
                      <button onClick={() => removeFromArray('adStrategies', i)}>×</button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Top Performing Ads / Notes</Label>
                <Textarea
                  value={editingCompetitor.topPerformingAds || ''}
                  onChange={(e) => setEditingCompetitor({ ...editingCompetitor, topPerformingAds: e.target.value })}
                  placeholder="Notes on their best performing ads, messaging, creative approach..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Strategy Tab */}
        {activeTab === 'content' && (
          <Card>
            <CardHeader>
              <CardTitle>Content Strategy</CardTitle>
              <CardDescription>Track competitor content marketing approach</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Content Types</Label>
                <div className="flex flex-wrap gap-2">
                  {contentTypeOptions.map((type) => (
                    <Badge
                      key={type}
                      variant={(editingCompetitor.contentTypes || []).includes(type) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('contentTypes', type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Posting Frequency</Label>
                  <Input
                    value={editingCompetitor.postingFrequency || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, postingFrequency: e.target.value })}
                    placeholder="e.g., Daily, 3x/week, Weekly"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Engagement Level</Label>
                  <select
                    value={editingCompetitor.engagementLevel || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, engagementLevel: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select level</option>
                    {engagementLevels.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes / Observations</Label>
                <Textarea
                  value={editingCompetitor.notes || ''}
                  onChange={(e) => setEditingCompetitor({ ...editingCompetitor, notes: e.target.value })}
                  placeholder="Additional notes about this competitor..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => { setShowForm(false); setEditingCompetitor(null); }}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (editingCompetitor.id ? 'Update Competitor' : 'Add Competitor')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Competitors</h2>
          <p className="text-sm text-gray-500">Track and analyze your competition for strategic insights</p>
        </div>
        <div className="flex gap-2">
          <AiFetchButton
            type="competitor"
            onDataFetched={(data) => {
              // If data is an object (single competitor), create it
              if (data && !Array.isArray(data)) {
                const newCompetitor: Partial<Competitor> = {
                  ...emptyCompetitor,
                  name: data.basicInfo?.name || '',
                  website: data.basicInfo?.website || '',
                  description: data.basicInfo?.description || '',
                  industry: data.basicInfo?.industry || '',
                  size: data.basicInfo?.size || '',
                  founded: data.basicInfo?.founded || '',
                  headquarters: data.basicInfo?.headquarters || '',
                  facebookUrl: data.socialMedia?.facebook?.url || '',
                  instagramUrl: data.socialMedia?.instagram?.url || '',
                  linkedinUrl: data.socialMedia?.linkedin?.url || '',
                  twitterUrl: data.socialMedia?.twitter?.url || '',
                  pricePosition: data.marketPosition?.pricePosition || '',
                  targetAudience: data.marketPosition?.targetAudience || '',
                  strengths: data.swot?.strengths || [],
                  weaknesses: data.swot?.weaknesses || [],
                  opportunities: data.swot?.opportunities || [],
                  threats: data.swot?.threats || [],
                  products: data.products || [],
                  services: data.services || [],
                  adPlatforms: data.adIntelligence?.platforms || [],
                  adBudgetEstimate: data.adIntelligence?.estimatedBudget || '',
                  contentTypes: data.adIntelligence?.contentTypes || [],
                };
                setEditingCompetitor(newCompetitor);
                setActiveTab('basic');
                setShowForm(true);
              }
            }}
            buttonText="Fetch Competitor with AI"
          />
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Competitor
          </Button>
        </div>
      </div>

      {competitors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No competitors tracked</h3>
            <p className="text-gray-500 mb-4">
              Add your competitors to get strategic insights and content ideas
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" /> Add Your First Competitor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitors.map((competitor) => (
            <Card key={competitor.id} className={!competitor.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {competitor.name}
                      {getThreatBadge(competitor.threatLevel)}
                    </CardTitle>
                    {competitor.industry && (
                      <CardDescription>{competitor.industry}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(competitor)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(competitor.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {competitor.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{competitor.description}</p>
                )}

                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                  {competitor.website && (
                    <a href={competitor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600">
                      <Globe className="h-3 w-3" /> Website
                    </a>
                  )}
                  {competitor.size && <span>{competitor.size}</span>}
                  {competitor.pricePosition && <Badge variant="outline">{competitor.pricePosition}</Badge>}
                </div>

                {/* Social icons */}
                <div className="flex gap-2 mb-3">
                  {competitor.facebookUrl && <Facebook className="h-4 w-4 text-blue-600" />}
                  {competitor.instagramUrl && <Instagram className="h-4 w-4 text-pink-600" />}
                  {competitor.linkedinUrl && <Linkedin className="h-4 w-4 text-blue-700" />}
                  {competitor.twitterUrl && <Twitter className="h-4 w-4 text-blue-400" />}
                  {competitor.youtubeUrl && <Youtube className="h-4 w-4 text-red-600" />}
                </div>

                {/* SWOT Summary */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {competitor.strengths.length > 0 && (
                    <div className="text-green-700">
                      <span className="font-medium">{competitor.strengths.length}</span> Strengths
                    </div>
                  )}
                  {competitor.weaknesses.length > 0 && (
                    <div className="text-red-700">
                      <span className="font-medium">{competitor.weaknesses.length}</span> Weaknesses
                    </div>
                  )}
                </div>

                {competitor.adPlatforms.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {competitor.adPlatforms.slice(0, 3).map((p, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                    ))}
                    {competitor.adPlatforms.length > 3 && (
                      <Badge variant="secondary" className="text-xs">+{competitor.adPlatforms.length - 3}</Badge>
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
