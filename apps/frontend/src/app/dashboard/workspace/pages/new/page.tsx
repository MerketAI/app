'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, FileCode, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { pagesApi } from '@/lib/api';
import { toast } from 'sonner';

const PAGE_TYPES = [
  { value: 'landing', label: 'Landing Page', description: 'Hero, features, CTA - perfect for product launches' },
  { value: 'about', label: 'About Page', description: 'Company story, team, values' },
  { value: 'services', label: 'Services Page', description: 'Showcase your services or offerings' },
  { value: 'contact', label: 'Contact Page', description: 'Contact form and information' },
  { value: 'pricing', label: 'Pricing Page', description: 'Pricing tiers and comparison' },
  { value: 'blog', label: 'Blog Page', description: 'Blog listing layout' },
  { value: 'portfolio', label: 'Portfolio Page', description: 'Showcase your work' },
  { value: 'team', label: 'Team Page', description: 'Team member profiles' },
];

const STYLES = [
  { value: 'modern', label: 'Modern', description: 'Clean lines, gradients, rounded corners' },
  { value: 'minimal', label: 'Minimal', description: 'Lots of whitespace, simple typography' },
  { value: 'bold', label: 'Bold', description: 'Strong colors, large typography' },
  { value: 'corporate', label: 'Corporate', description: 'Professional and trustworthy' },
  { value: 'creative', label: 'Creative', description: 'Unique and artistic' },
  { value: 'elegant', label: 'Elegant', description: 'Sophisticated and refined' },
];

export default function NewPagePage() {
  const router = useRouter();
  const [step, setStep] = useState<'type' | 'details' | 'generating'>('type');
  const [pageType, setPageType] = useState('');
  const [style, setStyle] = useState('modern');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    // Auto-generate slug from title
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setSlug(generatedSlug);
  };

  const handleGenerate = async () => {
    if (!title || !slug || !prompt || !pageType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setGenerating(true);
    setStep('generating');

    try {
      const response = await pagesApi.generate({
        prompt,
        pageType,
        style,
        title,
        slug,
      });

      toast.success('Page generated successfully!');
      router.push(`/dashboard/workspace/pages/${response.data.page.id}/edit`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate page');
      setStep('details');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateBlank = async () => {
    if (!title || !slug) {
      toast.error('Please enter a title and slug');
      return;
    }

    setGenerating(true);
    try {
      const response = await pagesApi.create({ title, slug });
      toast.success('Page created!');
      router.push(`/dashboard/workspace/pages/${response.data.page.id}/edit`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create page');
    } finally {
      setGenerating(false);
    }
  };

  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
            <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating Your Page</h2>
          <p className="text-gray-600 mb-4">
            AI is crafting your {PAGE_TYPES.find(t => t.value === pageType)?.label || 'page'}...
          </p>
          <p className="text-sm text-gray-500">This may take up to 30 seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.push('/dashboard/workspace/pages')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Pages
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Page</h1>
        <p className="text-gray-600 mt-2">
          Use AI to generate a complete page or start from scratch
        </p>
      </div>

      {step === 'type' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Choose Page Type</h2>
            <div className="grid grid-cols-2 gap-4">
              {PAGE_TYPES.map((type) => (
                <Card
                  key={type.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    pageType === type.value ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setPageType(type.value)}
                >
                  <CardContent className="p-4">
                    <h3 className="font-medium">{type.label}</h3>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setPageType('');
                setStep('details');
              }}
            >
              Start Blank
            </Button>
            <Button
              onClick={() => setStep('details')}
              disabled={!pageType}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Page Details</CardTitle>
              <CardDescription>
                Provide basic information about your new page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Page Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g., About Us"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-gray-100 border border-r-0 rounded-l-md text-gray-500 text-sm">
                      /
                    </span>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      placeholder="about-us"
                      className="rounded-l-none"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {pageType && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-primary" />
                  AI Generation
                </CardTitle>
                <CardDescription>
                  Describe what you want on your {PAGE_TYPES.find(t => t.value === pageType)?.label}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="style">Visual Style</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <div>
                            <span className="font-medium">{s.label}</span>
                            <span className="text-gray-500 ml-2">- {s.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">Describe Your Page *</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={`Describe what you want on your ${PAGE_TYPES.find(t => t.value === pageType)?.label}...

Example: "Create a landing page for a SaaS product called TaskFlow that helps teams manage projects. Include a hero section with a bold headline, feature highlights showing task management, team collaboration, and analytics. Add customer testimonials and a pricing section with three tiers."`}
                    rows={6}
                  />
                  <p className="text-xs text-gray-500">
                    Be specific about sections, content, and style preferences for best results
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setStep('type')}
            >
              Back
            </Button>
            <div className="space-x-3">
              {!pageType && (
                <Button
                  onClick={handleCreateBlank}
                  disabled={generating || !title || !slug}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Blank Page'
                  )}
                </Button>
              )}
              {pageType && (
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !title || !slug || !prompt}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
