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
  Plus, Pencil, Trash2, Users, X, Heart, Target,
  Brain, ShoppingBag, Clock, MapPin, DollarSign
} from 'lucide-react';
import { AiFetchButton } from '@/components/ai-fetch';

interface Audience {
  id: string;
  name: string;
  description?: string;
  // Demographics
  ageMin?: number;
  ageMax?: number;
  gender?: string;
  incomeLevel?: string;
  educationLevel?: string;
  occupation?: string;
  location?: string;
  // Psychographics
  interests: string[];
  values: string[];
  lifestyle?: string;
  personality?: string;
  // Pain Points & Goals
  painPoints: string[];
  goals: string[];
  challenges: string[];
  motivations: string[];
  // Buying Behavior
  buyingFrequency?: string;
  avgOrderValue?: string;
  preferredChannels: string[];
  decisionFactors: string[];
  // Content Preferences
  socialPlatforms: string[];
  contentFormats: string[];
  bestPostingTimes?: Record<string, string>;
  communicationStyle?: string;
  // Notes
  notes?: string;
  isPrimary: boolean;
  isActive: boolean;
}

const emptyAudience: Partial<Audience> = {
  name: '',
  description: '',
  interests: [],
  values: [],
  painPoints: [],
  goals: [],
  challenges: [],
  motivations: [],
  preferredChannels: [],
  decisionFactors: [],
  socialPlatforms: [],
  contentFormats: [],
  isPrimary: false,
  isActive: true,
};

const genderOptions = ['All', 'Male', 'Female', 'Non-binary'];

const incomeLevels = [
  'Low income ($0-$30K)',
  'Lower middle ($30K-$50K)',
  'Middle ($50K-$75K)',
  'Upper middle ($75K-$150K)',
  'High income ($150K+)'
];

const educationLevels = [
  'High School', 'Some College', 'Bachelor\'s Degree',
  'Master\'s Degree', 'Doctorate', 'Trade/Vocational'
];

const lifestyles = [
  'Budget-conscious', 'Health-focused', 'Tech-savvy', 'Family-oriented',
  'Career-driven', 'Adventure-seeker', 'Eco-conscious', 'Luxury-oriented'
];

const personalities = [
  'Analytical', 'Creative', 'Practical', 'Social',
  'Ambitious', 'Cautious', 'Spontaneous', 'Methodical'
];

const buyingFrequencies = [
  'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually', 'As needed'
];

const channelOptions = [
  'Website/Online Store', 'Mobile App', 'Social Media',
  'Email', 'In-person', 'Phone', 'Marketplaces (Amazon, etc.)'
];

const platformOptions = [
  'Facebook', 'Instagram', 'LinkedIn', 'Twitter/X', 'TikTok',
  'YouTube', 'Pinterest', 'Reddit', 'WhatsApp', 'Snapchat'
];

const contentFormatOptions = [
  'Short-form video', 'Long-form video', 'Blog posts', 'Infographics',
  'Podcasts', 'Webinars', 'Case studies', 'eBooks/Guides', 'Social posts', 'Email newsletters'
];

const communicationStyles = [
  'Professional/Formal', 'Casual/Friendly', 'Educational', 'Inspirational',
  'Humorous', 'Direct/No-nonsense', 'Empathetic/Supportive'
];

export default function AudiencesPage() {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAudience, setEditingAudience] = useState<Partial<Audience> | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('demographics');

  // Input states for array fields
  const [interestInput, setInterestInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [painPointInput, setPainPointInput] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [challengeInput, setChallengeInput] = useState('');
  const [motivationInput, setMotivationInput] = useState('');
  const [factorInput, setFactorInput] = useState('');

  useEffect(() => {
    fetchAudiences();
  }, []);

  const fetchAudiences = async () => {
    try {
      const response = await businessApi.getAudiences();
      setAudiences(response.data);
    } catch (error) {
      toast.error('Failed to load audiences');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAudience({ ...emptyAudience });
    setActiveTab('demographics');
    setShowForm(true);
  };

  const handleEdit = (audience: Audience) => {
    setEditingAudience({ ...audience });
    setActiveTab('demographics');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this audience segment?')) return;
    try {
      await businessApi.deleteAudience(id);
      toast.success('Audience deleted');
      fetchAudiences();
    } catch (error) {
      toast.error('Failed to delete audience');
    }
  };

  const handleSave = async () => {
    if (!editingAudience?.name) {
      toast.error('Audience name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingAudience.id) {
        await businessApi.updateAudience(editingAudience.id, editingAudience);
        toast.success('Audience updated');
      } else {
        await businessApi.createAudience(editingAudience);
        toast.success('Audience created');
      }
      setShowForm(false);
      setEditingAudience(null);
      fetchAudiences();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save audience');
    } finally {
      setSaving(false);
    }
  };

  const addToArray = (field: keyof Audience, value: string, setValue: (v: string) => void) => {
    if (value.trim() && editingAudience) {
      const current = (editingAudience[field] as string[]) || [];
      setEditingAudience({
        ...editingAudience,
        [field]: [...current, value.trim()],
      });
      setValue('');
    }
  };

  const removeFromArray = (field: keyof Audience, index: number) => {
    if (editingAudience) {
      const current = (editingAudience[field] as string[]) || [];
      setEditingAudience({
        ...editingAudience,
        [field]: current.filter((_, i) => i !== index),
      });
    }
  };

  const toggleArrayItem = (field: keyof Audience, value: string) => {
    if (editingAudience) {
      const current = (editingAudience[field] as string[]) || [];
      if (current.includes(value)) {
        setEditingAudience({
          ...editingAudience,
          [field]: current.filter(v => v !== value),
        });
      } else {
        setEditingAudience({
          ...editingAudience,
          [field]: [...current, value],
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showForm && editingAudience) {
    const tabs = [
      { id: 'demographics', label: 'Demographics', icon: Users },
      { id: 'psychographics', label: 'Psychographics', icon: Brain },
      { id: 'painpoints', label: 'Pain Points & Goals', icon: Target },
      { id: 'behavior', label: 'Buying Behavior', icon: ShoppingBag },
      { id: 'content', label: 'Content Preferences', icon: Heart },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {editingAudience.id ? 'Edit Audience Segment' : 'Create Audience Segment'}
          </h2>
          <Button variant="ghost" onClick={() => { setShowForm(false); setEditingAudience(null); }}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Basic Info (always visible at top) */}
        <Card>
          <CardHeader>
            <CardTitle>Audience Segment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Segment Name *</Label>
                <Input
                  value={editingAudience.name || ''}
                  onChange={(e) => setEditingAudience({ ...editingAudience, name: e.target.value })}
                  placeholder="e.g., Young Professionals, Enterprise Buyers"
                />
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingAudience.isPrimary ?? false}
                    onChange={(e) => setEditingAudience({ ...editingAudience, isPrimary: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Primary Audience</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingAudience.isActive ?? true}
                    onChange={(e) => setEditingAudience({ ...editingAudience, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editingAudience.description || ''}
                onChange={(e) => setEditingAudience({ ...editingAudience, description: e.target.value })}
                placeholder="Brief description of this audience segment..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Demographics Tab */}
        {activeTab === 'demographics' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Demographics
              </CardTitle>
              <CardDescription>Define the demographic characteristics of this audience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Age Range</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      value={editingAudience.ageMin || ''}
                      onChange={(e) => setEditingAudience({ ...editingAudience, ageMin: parseInt(e.target.value) || undefined })}
                      placeholder="Min"
                      className="w-20"
                    />
                    <span>-</span>
                    <Input
                      type="number"
                      value={editingAudience.ageMax || ''}
                      onChange={(e) => setEditingAudience({ ...editingAudience, ageMax: parseInt(e.target.value) || undefined })}
                      placeholder="Max"
                      className="w-20"
                    />
                    <span className="text-sm text-gray-500">years</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <select
                    value={editingAudience.gender || ''}
                    onChange={(e) => setEditingAudience({ ...editingAudience, gender: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Any</option>
                    {genderOptions.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Income Level</Label>
                  <select
                    value={editingAudience.incomeLevel || ''}
                    onChange={(e) => setEditingAudience({ ...editingAudience, incomeLevel: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Any</option>
                    {incomeLevels.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Education Level</Label>
                  <select
                    value={editingAudience.educationLevel || ''}
                    onChange={(e) => setEditingAudience({ ...editingAudience, educationLevel: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Any</option>
                    {educationLevels.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Occupation</Label>
                  <Input
                    value={editingAudience.occupation || ''}
                    onChange={(e) => setEditingAudience({ ...editingAudience, occupation: e.target.value })}
                    placeholder="e.g., Marketing Manager, Developer"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> Location
                  </Label>
                  <Input
                    value={editingAudience.location || ''}
                    onChange={(e) => setEditingAudience({ ...editingAudience, location: e.target.value })}
                    placeholder="e.g., US, Urban areas, California"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Psychographics Tab */}
        {activeTab === 'psychographics' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Psychographics
              </CardTitle>
              <CardDescription>Understand the attitudes, values, and lifestyle of this audience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Interests</Label>
                <div className="flex gap-2">
                  <Input
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    placeholder="Add interest..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('interests', interestInput, setInterestInput))}
                  />
                  <Button onClick={() => addToArray('interests', interestInput, setInterestInput)}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editingAudience.interests || []).map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {item}
                      <button onClick={() => removeFromArray('interests', i)}>×</button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Values</Label>
                <div className="flex gap-2">
                  <Input
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    placeholder="Add value..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('values', valueInput, setValueInput))}
                  />
                  <Button onClick={() => addToArray('values', valueInput, setValueInput)}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editingAudience.values || []).map((item, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {item}
                      <button onClick={() => removeFromArray('values', i)}>×</button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lifestyle</Label>
                  <select
                    value={editingAudience.lifestyle || ''}
                    onChange={(e) => setEditingAudience({ ...editingAudience, lifestyle: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select lifestyle</option>
                    {lifestyles.map((ls) => (
                      <option key={ls} value={ls}>{ls}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Personality Type</Label>
                  <select
                    value={editingAudience.personality || ''}
                    onChange={(e) => setEditingAudience({ ...editingAudience, personality: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select personality</option>
                    {personalities.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pain Points & Goals Tab */}
        {activeTab === 'painpoints' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-700">Pain Points</CardTitle>
                <CardDescription>What problems does this audience face?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={painPointInput}
                    onChange={(e) => setPainPointInput(e.target.value)}
                    placeholder="Add pain point..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('painPoints', painPointInput, setPainPointInput))}
                  />
                  <Button onClick={() => addToArray('painPoints', painPointInput, setPainPointInput)}>Add</Button>
                </div>
                <div className="space-y-1">
                  {(editingAudience.painPoints || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-red-50 rounded text-sm">
                      <span className="flex-1">{item}</span>
                      <button onClick={() => removeFromArray('painPoints', i)} className="text-gray-400 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">Goals</CardTitle>
                <CardDescription>What does this audience want to achieve?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder="Add goal..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('goals', goalInput, setGoalInput))}
                  />
                  <Button onClick={() => addToArray('goals', goalInput, setGoalInput)}>Add</Button>
                </div>
                <div className="space-y-1">
                  {(editingAudience.goals || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm">
                      <span className="flex-1">{item}</span>
                      <button onClick={() => removeFromArray('goals', i)} className="text-gray-400 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-orange-700 text-base">Challenges</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={challengeInput}
                      onChange={(e) => setChallengeInput(e.target.value)}
                      placeholder="Add challenge..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('challenges', challengeInput, setChallengeInput))}
                    />
                    <Button size="sm" onClick={() => addToArray('challenges', challengeInput, setChallengeInput)}>Add</Button>
                  </div>
                  <div className="space-y-1">
                    {(editingAudience.challenges || []).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-orange-50 rounded text-sm">
                        <span className="flex-1">{item}</span>
                        <button onClick={() => removeFromArray('challenges', i)} className="text-gray-400 hover:text-red-500">×</button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-blue-700 text-base">Motivations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={motivationInput}
                      onChange={(e) => setMotivationInput(e.target.value)}
                      placeholder="Add motivation..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('motivations', motivationInput, setMotivationInput))}
                    />
                    <Button size="sm" onClick={() => addToArray('motivations', motivationInput, setMotivationInput)}>Add</Button>
                  </div>
                  <div className="space-y-1">
                    {(editingAudience.motivations || []).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm">
                        <span className="flex-1">{item}</span>
                        <button onClick={() => removeFromArray('motivations', i)} className="text-gray-400 hover:text-red-500">×</button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Buying Behavior Tab */}
        {activeTab === 'behavior' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Buying Behavior
              </CardTitle>
              <CardDescription>How does this audience make purchasing decisions?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Buying Frequency
                  </Label>
                  <select
                    value={editingAudience.buyingFrequency || ''}
                    onChange={(e) => setEditingAudience({ ...editingAudience, buyingFrequency: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select frequency</option>
                    {buyingFrequencies.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" /> Average Order Value
                  </Label>
                  <Input
                    value={editingAudience.avgOrderValue || ''}
                    onChange={(e) => setEditingAudience({ ...editingAudience, avgOrderValue: e.target.value })}
                    placeholder="e.g., $50-100, $500+"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preferred Purchase Channels</Label>
                <div className="flex flex-wrap gap-2">
                  {channelOptions.map((channel) => (
                    <Badge
                      key={channel}
                      variant={(editingAudience.preferredChannels || []).includes(channel) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('preferredChannels', channel)}
                    >
                      {channel}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Key Decision Factors</Label>
                <div className="flex gap-2">
                  <Input
                    value={factorInput}
                    onChange={(e) => setFactorInput(e.target.value)}
                    placeholder="Add decision factor..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('decisionFactors', factorInput, setFactorInput))}
                  />
                  <Button onClick={() => addToArray('decisionFactors', factorInput, setFactorInput)}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editingAudience.decisionFactors || []).map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {item}
                      <button onClick={() => removeFromArray('decisionFactors', i)}>×</button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Preferences Tab */}
        {activeTab === 'content' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Content Preferences
              </CardTitle>
              <CardDescription>How does this audience consume content?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Social Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {platformOptions.map((platform) => (
                    <Badge
                      key={platform}
                      variant={(editingAudience.socialPlatforms || []).includes(platform) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('socialPlatforms', platform)}
                    >
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preferred Content Formats</Label>
                <div className="flex flex-wrap gap-2">
                  {contentFormatOptions.map((format) => (
                    <Badge
                      key={format}
                      variant={(editingAudience.contentFormats || []).includes(format) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('contentFormats', format)}
                    >
                      {format}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Communication Style</Label>
                <select
                  value={editingAudience.communicationStyle || ''}
                  onChange={(e) => setEditingAudience({ ...editingAudience, communicationStyle: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select style</option>
                  {communicationStyles.map((style) => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editingAudience.notes || ''}
                  onChange={(e) => setEditingAudience({ ...editingAudience, notes: e.target.value })}
                  placeholder="Additional notes about this audience segment..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => { setShowForm(false); setEditingAudience(null); }}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (editingAudience.id ? 'Update Audience' : 'Create Audience')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Target Audiences</h2>
          <p className="text-sm text-gray-500">Define your ideal customer segments for targeted content</p>
        </div>
        <div className="flex gap-2">
          <AiFetchButton
            type="audience"
            onDataFetched={(data) => {
              if (Array.isArray(data) && data.length > 0) {
                const audience = data[0];
                const newAudience: Partial<Audience> = {
                  ...emptyAudience,
                  name: audience.name || '',
                  description: audience.description || '',
                  ageMin: audience.demographics?.ageRange ? parseInt(audience.demographics.ageRange.split('-')[0]) : undefined,
                  ageMax: audience.demographics?.ageRange ? parseInt(audience.demographics.ageRange.split('-')[1]) : undefined,
                  gender: audience.demographics?.gender || '',
                  incomeLevel: audience.demographics?.income || '',
                  educationLevel: audience.demographics?.education || '',
                  occupation: audience.demographics?.occupation || '',
                  location: audience.demographics?.location || '',
                  interests: audience.psychographics?.interests || [],
                  values: audience.psychographics?.values || [],
                  lifestyle: audience.psychographics?.lifestyle || '',
                  personality: audience.psychographics?.personality || '',
                  painPoints: audience.painPoints || [],
                  goals: audience.goals || [],
                  buyingBehavior: audience.buyingBehavior || '',
                  preferredChannels: audience.preferredChannels || [],
                };
                setEditingAudience(newAudience);
                setActiveTab('demographics');
                setShowForm(true);
                toast.info(`${data.length} audience segments found. Showing first one.`);
              }
            }}
            buttonText="Discover Audiences with AI"
          />
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Audience
          </Button>
        </div>
      </div>

      {audiences.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audience segments</h3>
            <p className="text-gray-500 mb-4">
              Define your target audiences to create more relevant content
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" /> Create Your First Audience
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {audiences.map((audience) => (
            <Card key={audience.id} className={!audience.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {audience.name}
                      {audience.isPrimary && <Badge className="bg-blue-600">Primary</Badge>}
                    </CardTitle>
                    {audience.description && (
                      <CardDescription className="line-clamp-1">{audience.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(audience)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(audience.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Demographics summary */}
                <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-3">
                  {(audience.ageMin || audience.ageMax) && (
                    <span>Age: {audience.ageMin || '?'}-{audience.ageMax || '?'}</span>
                  )}
                  {audience.gender && <span>• {audience.gender}</span>}
                  {audience.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {audience.location}
                    </span>
                  )}
                </div>

                {/* Pain points & goals summary */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  {audience.painPoints.length > 0 && (
                    <div className="text-red-600">
                      <span className="font-medium">{audience.painPoints.length}</span> Pain Points
                    </div>
                  )}
                  {audience.goals.length > 0 && (
                    <div className="text-green-600">
                      <span className="font-medium">{audience.goals.length}</span> Goals
                    </div>
                  )}
                </div>

                {/* Social platforms */}
                {audience.socialPlatforms.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {audience.socialPlatforms.slice(0, 4).map((p, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                    ))}
                    {audience.socialPlatforms.length > 4 && (
                      <Badge variant="secondary" className="text-xs">+{audience.socialPlatforms.length - 4}</Badge>
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
