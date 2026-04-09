'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adsApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Megaphone,
  Target,
  Palette,
} from 'lucide-react';

const PLATFORMS = [
  { value: 'GOOGLE_ADS', label: 'Google Ads', description: 'Search, Display, and YouTube ads' },
  { value: 'META_ADS', label: 'Meta Ads', description: 'Facebook and Instagram ads' },
];

const CAMPAIGN_TYPES: Record<string, { value: string; label: string; description: string }[]> = {
  GOOGLE_ADS: [
    { value: 'SEARCH', label: 'Search', description: 'Text ads on Google search results' },
    { value: 'DISPLAY', label: 'Display', description: 'Visual ads across the Google Display Network' },
    { value: 'VIDEO', label: 'Video', description: 'Video ads on YouTube and partner sites' },
    { value: 'SHOPPING', label: 'Shopping', description: 'Product listing ads on Google Shopping' },
  ],
  META_ADS: [
    { value: 'AWARENESS', label: 'Awareness', description: 'Maximize brand reach and recall' },
    { value: 'TRAFFIC', label: 'Traffic', description: 'Drive visits to your website or app' },
    { value: 'CONVERSIONS', label: 'Conversions', description: 'Drive valuable actions on your site' },
    { value: 'LEADS', label: 'Lead Generation', description: 'Collect leads through forms' },
    { value: 'ENGAGEMENT', label: 'Engagement', description: 'Get more post engagement and page likes' },
  ],
};

const STEPS = [
  { label: 'Platform & Objective', icon: Megaphone },
  { label: 'Targeting & Budget', icon: Target },
  { label: 'Creative & Review', icon: Palette },
];

interface CampaignFormData {
  name: string;
  platform: string;
  campaignType: string;
  budgetType: 'DAILY' | 'LIFETIME';
  budget: string;
  startDate: string;
  endDate: string;
  keywords: string;
  locations: string;
  ageMin: string;
  ageMax: string;
  gender: string;
  headlines: string[];
  descriptions: string[];
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CampaignFormData>({
    name: '',
    platform: '',
    campaignType: '',
    budgetType: 'DAILY',
    budget: '',
    startDate: '',
    endDate: '',
    keywords: '',
    locations: '',
    ageMin: '18',
    ageMax: '65',
    gender: 'ALL',
    headlines: ['', '', ''],
    descriptions: ['', ''],
  });

  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateHeadline = (index: number, value: string) => {
    setForm((prev) => {
      const headlines = [...prev.headlines];
      headlines[index] = value;
      return { ...prev, headlines };
    });
  };

  const updateDescription = (index: number, value: string) => {
    setForm((prev) => {
      const descriptions = [...prev.descriptions];
      descriptions[index] = value;
      return { ...prev, descriptions };
    });
  };

  const canProceedStep0 = form.platform && form.campaignType && form.name;
  const canProceedStep1 = form.budget && form.startDate;
  const canSubmit = canProceedStep0 && canProceedStep1 && form.headlines[0];

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await adsApi.createCampaign({
        name: form.name,
        platform: form.platform,
        campaignType: form.campaignType,
        budgetType: form.budgetType,
        budget: parseFloat(form.budget),
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        targeting: {
          keywords: form.keywords ? form.keywords.split(',').map((k) => k.trim()) : [],
          locations: form.locations ? form.locations.split(',').map((l) => l.trim()) : [],
          ageMin: parseInt(form.ageMin),
          ageMax: parseInt(form.ageMax),
          gender: form.gender,
        },
        creative: {
          headlines: form.headlines.filter(Boolean),
          descriptions: form.descriptions.filter(Boolean),
        },
      });
      toast.success('Campaign created successfully');
      router.push('/dashboard/ads');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/ads')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Campaign</h1>
          <p className="text-gray-500 mt-1">Set up a new ad campaign</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium',
                    i < step
                      ? 'bg-primary text-primary-foreground'
                      : i === step
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-100 text-gray-400'
                  )}
                >
                  {i < step ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium hidden sm:block',
                    i <= step ? 'text-foreground' : 'text-gray-400'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4',
                    i < step ? 'bg-primary' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 0: Platform & Objective */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Platform & Objective</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Campaign Name</Label>
              <Input
                className="mt-1.5"
                placeholder="e.g., Spring Sale 2026"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
              />
            </div>

            <div>
              <Label>Advertising Platform</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={cn(
                      'p-4 border rounded-lg text-left transition-all',
                      form.platform === p.value
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'hover:border-gray-400'
                    )}
                    onClick={() => {
                      updateForm('platform', p.value);
                      updateForm('campaignType', '');
                    }}
                  >
                    <div className="font-medium">{p.label}</div>
                    <div className="text-sm text-gray-500 mt-1">{p.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {form.platform && (
              <div>
                <Label>Campaign Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {(CAMPAIGN_TYPES[form.platform] || []).map((ct) => (
                    <button
                      key={ct.value}
                      type="button"
                      className={cn(
                        'p-3 border rounded-lg text-left transition-all',
                        form.campaignType === ct.value
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:border-gray-400'
                      )}
                      onClick={() => updateForm('campaignType', ct.value)}
                    >
                      <div className="font-medium text-sm">{ct.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{ct.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Targeting & Budget */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Targeting & Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Budget Type</Label>
                <select
                  className="mt-1.5 w-full border rounded-md px-3 py-2 text-sm"
                  value={form.budgetType}
                  onChange={(e) => updateForm('budgetType', e.target.value)}
                >
                  <option value="DAILY">Daily Budget</option>
                  <option value="LIFETIME">Lifetime Budget</option>
                </select>
              </div>
              <div>
                <Label>Budget Amount ($)</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min="1"
                  placeholder="e.g., 50"
                  value={form.budget}
                  onChange={(e) => updateForm('budget', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  className="mt-1.5"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateForm('startDate', e.target.value)}
                />
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input
                  className="mt-1.5"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateForm('endDate', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Keywords (comma-separated)</Label>
              <Input
                className="mt-1.5"
                placeholder="e.g., marketing, automation, AI tools"
                value={form.keywords}
                onChange={(e) => updateForm('keywords', e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Used for search ad targeting and optimization</p>
            </div>

            <div>
              <Label>Target Locations (comma-separated)</Label>
              <Input
                className="mt-1.5"
                placeholder="e.g., United States, Canada, United Kingdom"
                value={form.locations}
                onChange={(e) => updateForm('locations', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Min Age</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min="13"
                  max="65"
                  value={form.ageMin}
                  onChange={(e) => updateForm('ageMin', e.target.value)}
                />
              </div>
              <div>
                <Label>Max Age</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min="13"
                  max="65"
                  value={form.ageMax}
                  onChange={(e) => updateForm('ageMax', e.target.value)}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <select
                  className="mt-1.5 w-full border rounded-md px-3 py-2 text-sm"
                  value={form.gender}
                  onChange={(e) => updateForm('gender', e.target.value)}
                >
                  <option value="ALL">All</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Creative & Review */}
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ad Creative</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Headlines</Label>
                <p className="text-xs text-gray-400 mb-2">Add up to 3 headlines (max 30 characters each)</p>
                {form.headlines.map((h, i) => (
                  <Input
                    key={i}
                    className="mb-2"
                    placeholder={`Headline ${i + 1}`}
                    maxLength={30}
                    value={h}
                    onChange={(e) => updateHeadline(i, e.target.value)}
                  />
                ))}
              </div>
              <div>
                <Label>Descriptions</Label>
                <p className="text-xs text-gray-400 mb-2">Add up to 2 descriptions (max 90 characters each)</p>
                {form.descriptions.map((d, i) => (
                  <Input
                    key={i}
                    className="mb-2"
                    placeholder={`Description ${i + 1}`}
                    maxLength={90}
                    value={d}
                    onChange={(e) => updateDescription(i, e.target.value)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Review Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Review Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <dt className="text-sm text-gray-500">Campaign Name</dt>
                  <dd className="text-sm font-medium">{form.name || '-'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <dt className="text-sm text-gray-500">Platform</dt>
                  <dd className="text-sm font-medium">
                    {PLATFORMS.find((p) => p.value === form.platform)?.label || '-'}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <dt className="text-sm text-gray-500">Campaign Type</dt>
                  <dd className="text-sm font-medium">{form.campaignType || '-'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <dt className="text-sm text-gray-500">Budget</dt>
                  <dd className="text-sm font-medium">
                    ${form.budget || '0'} {form.budgetType === 'DAILY' ? '/ day' : 'lifetime'}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <dt className="text-sm text-gray-500">Dates</dt>
                  <dd className="text-sm font-medium">
                    {form.startDate || '-'} {form.endDate ? `to ${form.endDate}` : '(no end date)'}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <dt className="text-sm text-gray-500">Target Audience</dt>
                  <dd className="text-sm font-medium">
                    Age {form.ageMin}-{form.ageMax}, {form.gender}
                  </dd>
                </div>
                {form.locations && (
                  <div className="flex justify-between py-2 border-b">
                    <dt className="text-sm text-gray-500">Locations</dt>
                    <dd className="text-sm font-medium">{form.locations}</dd>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <dt className="text-sm text-gray-500">Headlines</dt>
                  <dd className="text-sm font-medium text-right">
                    {form.headlines.filter(Boolean).join(' | ') || '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={step === 0}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        {step < 2 ? (
          <Button
            onClick={handleNext}
            disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Create Campaign
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
