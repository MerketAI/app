'use client';

import { useEffect, useState } from 'react';
import { businessApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building2, Globe, MapPin, Users, DollarSign, Target, Sparkles } from 'lucide-react';
import { BusinessScanModal } from '@/components/ai-fetch';

interface BusinessProfile {
  businessName?: string;
  industry?: string;
  subIndustry?: string;
  description?: string;
  mission?: string;
  vision?: string;
  foundedYear?: number;
  employeeCount?: string;
  annualRevenue?: string;
  businessModel?: string;
  location?: string;
  country?: string;
  city?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  valueProposition?: string;
  uniqueSellingPoints?: string[];
  marketPosition?: string;
  pricingStrategy?: string;
  completeness?: number;
}

const industries = [
  'Technology', 'Healthcare', 'Finance', 'Retail', 'E-commerce', 'Education',
  'Marketing', 'Real Estate', 'Food & Beverage', 'Manufacturing', 'Consulting',
  'Legal', 'Travel & Tourism', 'Entertainment', 'Fashion', 'Fitness', 'Other'
];

const employeeRanges = [
  '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
];

const revenueRanges = [
  'Pre-revenue', '$0-$100K', '$100K-$500K', '$500K-$1M', '$1M-$5M', '$5M-$10M', '$10M+'
];

const businessModels = [
  'B2B', 'B2C', 'B2B2C', 'D2C', 'SaaS', 'Marketplace', 'Subscription', 'Freemium', 'Agency', 'Other'
];

const marketPositions = [
  'Market Leader', 'Challenger', 'Niche Player', 'New Entrant', 'Fast Follower'
];

const pricingStrategies = [
  'Premium', 'Value', 'Competitive', 'Penetration', 'Skimming', 'Freemium'
];

export default function BusinessOverviewPage() {
  const [profile, setProfile] = useState<BusinessProfile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uspInput, setUspInput] = useState('');
  const [showScanModal, setShowScanModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await businessApi.getProfile();
      setProfile(response.data);
    } catch (error) {
      console.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await businessApi.updateProfile(profile);
      toast.success('Business profile saved successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const addUSP = () => {
    if (uspInput.trim()) {
      setProfile({
        ...profile,
        uniqueSellingPoints: [...(profile.uniqueSellingPoints || []), uspInput.trim()],
      });
      setUspInput('');
    }
  };

  const removeUSP = (index: number) => {
    setProfile({
      ...profile,
      uniqueSellingPoints: (profile.uniqueSellingPoints || []).filter((_, i) => i !== index),
    });
  };

  const handleScannedData = (data: any) => {
    // Map scanned data to profile fields
    setProfile((prev) => ({
      ...prev,
      businessName: data.name || prev.businessName,
      industry: data.industry || prev.industry,
      subIndustry: data.subIndustry || prev.subIndustry,
      description: data.description || prev.description,
      mission: data.mission || prev.mission,
      vision: data.vision || prev.vision,
      foundedYear: data.foundedYear || prev.foundedYear,
      employeeCount: data.employeeCount || prev.employeeCount,
      website: data.website || prev.website,
      location: data.headquarters || data.address || prev.location,
      valueProposition: data.valueProposition || prev.valueProposition,
      uniqueSellingPoints: data.uniqueSellingPoints?.length
        ? [...(prev.uniqueSellingPoints || []), ...data.uniqueSellingPoints]
        : prev.uniqueSellingPoints,
      marketPosition: data.pricePosition || prev.marketPosition,
      socialLinks: {
        ...prev.socialLinks,
        ...(data.socialLinks || {}),
      },
    }));
    toast.success('Business data populated from scan!');
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
      {/* Company Basics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Basic information about your business
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowScanModal(true)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4 text-purple-500" />
              Scan with AI
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={profile.businessName || ''}
                onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                placeholder="Your company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={profile.website || ''}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder="https://yourcompany.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry *</Label>
              <select
                id="industry"
                value={profile.industry || ''}
                onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select industry</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subIndustry">Sub-Industry</Label>
              <Input
                id="subIndustry"
                value={profile.subIndustry || ''}
                onChange={(e) => setProfile({ ...profile, subIndustry: e.target.value })}
                placeholder="e.g., SaaS, Fintech"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Business Description *</Label>
            <Textarea
              id="description"
              value={profile.description || ''}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              placeholder="Describe what your business does, who you serve, and what problems you solve..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mission">Mission Statement</Label>
              <Textarea
                id="mission"
                value={profile.mission || ''}
                onChange={(e) => setProfile({ ...profile, mission: e.target.value })}
                placeholder="Your company's mission..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vision">Vision Statement</Label>
              <Textarea
                id="vision"
                value={profile.vision || ''}
                onChange={(e) => setProfile({ ...profile, vision: e.target.value })}
                placeholder="Your company's vision..."
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Size & Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Company Size & Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="foundedYear">Founded Year</Label>
              <Input
                id="foundedYear"
                type="number"
                value={profile.foundedYear || ''}
                onChange={(e) => setProfile({ ...profile, foundedYear: parseInt(e.target.value) || undefined })}
                placeholder="2020"
                min={1800}
                max={new Date().getFullYear()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeCount">Employee Count</Label>
              <select
                id="employeeCount"
                value={profile.employeeCount || ''}
                onChange={(e) => setProfile({ ...profile, employeeCount: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select range</option>
                {employeeRanges.map((range) => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="annualRevenue">Annual Revenue</Label>
              <select
                id="annualRevenue"
                value={profile.annualRevenue || ''}
                onChange={(e) => setProfile({ ...profile, annualRevenue: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select range</option>
                {revenueRanges.map((range) => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessModel">Business Model</Label>
              <select
                id="businessModel"
                value={profile.businessModel || ''}
                onChange={(e) => setProfile({ ...profile, businessModel: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select model</option>
                {businessModels.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={profile.country || ''}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                placeholder="e.g., United States"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={profile.city || ''}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                placeholder="e.g., San Francisco"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Position */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Market Position & Strategy
          </CardTitle>
          <CardDescription>
            Define your market position and competitive advantages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="valueProposition">Value Proposition *</Label>
            <Textarea
              id="valueProposition"
              value={profile.valueProposition || ''}
              onChange={(e) => setProfile({ ...profile, valueProposition: e.target.value })}
              placeholder="What unique value do you provide to customers? Why should they choose you over competitors?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Unique Selling Points (USPs)</Label>
            <div className="flex gap-2">
              <Input
                value={uspInput}
                onChange={(e) => setUspInput(e.target.value)}
                placeholder="Add a unique selling point..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addUSP())}
              />
              <Button type="button" onClick={addUSP}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(profile.uniqueSellingPoints || []).map((usp, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {usp}
                  <button
                    onClick={() => removeUSP(index)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marketPosition">Market Position</Label>
              <select
                id="marketPosition"
                value={profile.marketPosition || ''}
                onChange={(e) => setProfile({ ...profile, marketPosition: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select position</option>
                {marketPositions.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricingStrategy">Pricing Strategy</Label>
              <select
                id="pricingStrategy"
                value={profile.pricingStrategy || ''}
                onChange={(e) => setProfile({ ...profile, pricingStrategy: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select strategy</option>
                {pricingStrategies.map((strat) => (
                  <option key={strat} value={strat}>{strat}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Social Media Presence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input
                value={profile.socialLinks?.facebook || ''}
                onChange={(e) => setProfile({
                  ...profile,
                  socialLinks: { ...profile.socialLinks, facebook: e.target.value }
                })}
                placeholder="https://facebook.com/yourpage"
              />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input
                value={profile.socialLinks?.instagram || ''}
                onChange={(e) => setProfile({
                  ...profile,
                  socialLinks: { ...profile.socialLinks, instagram: e.target.value }
                })}
                placeholder="https://instagram.com/yourhandle"
              />
            </div>
            <div className="space-y-2">
              <Label>LinkedIn</Label>
              <Input
                value={profile.socialLinks?.linkedin || ''}
                onChange={(e) => setProfile({
                  ...profile,
                  socialLinks: { ...profile.socialLinks, linkedin: e.target.value }
                })}
                placeholder="https://linkedin.com/company/yourcompany"
              />
            </div>
            <div className="space-y-2">
              <Label>Twitter/X</Label>
              <Input
                value={profile.socialLinks?.twitter || ''}
                onChange={(e) => setProfile({
                  ...profile,
                  socialLinks: { ...profile.socialLinks, twitter: e.target.value }
                })}
                placeholder="https://twitter.com/yourhandle"
              />
            </div>
            <div className="space-y-2">
              <Label>YouTube</Label>
              <Input
                value={profile.socialLinks?.youtube || ''}
                onChange={(e) => setProfile({
                  ...profile,
                  socialLinks: { ...profile.socialLinks, youtube: e.target.value }
                })}
                placeholder="https://youtube.com/@yourchannel"
              />
            </div>
            <div className="space-y-2">
              <Label>TikTok</Label>
              <Input
                value={profile.socialLinks?.tiktok || ''}
                onChange={(e) => setProfile({
                  ...profile,
                  socialLinks: { ...profile.socialLinks, tiktok: e.target.value }
                })}
                placeholder="https://tiktok.com/@yourhandle"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? 'Saving...' : 'Save Business Profile'}
        </Button>
      </div>

      {/* AI Scan Modal */}
      <BusinessScanModal
        open={showScanModal}
        onClose={() => setShowScanModal(false)}
        onDataScanned={handleScannedData}
      />
    </div>
  );
}
