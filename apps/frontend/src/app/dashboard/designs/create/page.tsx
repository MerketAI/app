'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Download,
  Code,
  Eye,
  Palette,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { designApi, businessApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const sizePresets = [
  { value: 'instagram_post', label: 'Instagram Post', dimensions: '1080 x 1080' },
  { value: 'instagram_story', label: 'Instagram Story', dimensions: '1080 x 1920' },
  { value: 'facebook_cover', label: 'Facebook Cover', dimensions: '820 x 312' },
  { value: 'facebook_post', label: 'Facebook Post', dimensions: '1200 x 630' },
  { value: 'twitter_post', label: 'Twitter/X Post', dimensions: '1200 x 675' },
  { value: 'linkedin_post', label: 'LinkedIn Post', dimensions: '1200 x 627' },
  { value: 'a4_flyer', label: 'A4 Flyer', dimensions: '2480 x 3508' },
  { value: 'us_letter', label: 'US Letter', dimensions: '2550 x 3300' },
  { value: 'youtube_thumbnail', label: 'YouTube Thumbnail', dimensions: '1280 x 720' },
  { value: 'banner_wide', label: 'Wide Banner', dimensions: '1920 x 480' },
  { value: 'poster_24x36', label: 'Poster (24x36)', dimensions: '2400 x 3600' },
  { value: 'ad_square', label: 'Square Ad', dimensions: '1080 x 1080' },
];

const styles = [
  { value: 'modern', label: 'Modern', desc: 'Clean lines, contemporary feel' },
  { value: 'minimal', label: 'Minimal', desc: 'Less is more, whitespace focused' },
  { value: 'bold', label: 'Bold', desc: 'Strong colors, impactful typography' },
  { value: 'corporate', label: 'Corporate', desc: 'Professional, business-oriented' },
  { value: 'creative', label: 'Creative', desc: 'Artistic, expressive layouts' },
  { value: 'elegant', label: 'Elegant', desc: 'Refined, sophisticated aesthetic' },
];

const designCategories = [
  { value: 'SOCIAL_POST', label: 'Social Post' },
  { value: 'FLYER', label: 'Flyer' },
  { value: 'BANNER', label: 'Banner' },
  { value: 'POSTER', label: 'Poster' },
  { value: 'STORY', label: 'Story' },
  { value: 'AD', label: 'Ad' },
];

export default function CreateDesignPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('instagram_post');
  const [selectedStyle, setSelectedStyle] = useState('modern');
  const [selectedCategory, setSelectedCategory] = useState('SOCIAL_POST');
  const [businessContext, setBusinessContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedDesign, setGeneratedDesign] = useState<any>(null);
  const [showHtml, setShowHtml] = useState(false);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    const fetchBusinessContext = async () => {
      try {
        const res = await businessApi.getProfile();
        const profile = res.data;
        if (profile) {
          const parts = [];
          if (profile.companyName) parts.push(profile.companyName);
          if (profile.industry) parts.push(profile.industry);
          if (profile.description) parts.push(profile.description);
          setBusinessContext(parts.join(' - '));
        }
      } catch {
        // No business profile, that's fine
      }
    };
    fetchBusinessContext();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe what you want to create');
      return;
    }
    setGenerating(true);
    setGeneratedDesign(null);
    try {
      const res = await designApi.generateDesign({
        prompt,
        category: selectedCategory,
        sizePreset: selectedPreset,
        style: selectedStyle,
        businessContext: businessContext || undefined,
      });
      setGeneratedDesign(res.data);
      toast.success('Design generated!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate design');
    } finally {
      setGenerating(false);
    }
  };

  const handleRender = async () => {
    if (!generatedDesign?.id) return;
    setRendering(true);
    try {
      const res = await designApi.renderDesign(generatedDesign.id, { format: 'png' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${generatedDesign.name || 'design'}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Design rendered and downloaded');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to render design');
    } finally {
      setRendering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/designs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Design</h1>
          <p className="text-gray-500 mt-1">Generate marketing designs with AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-6">
          {/* Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Describe Your Design
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g. Instagram post for summer sale with blue theme, tropical vibes, 50% off text prominently displayed"
                className="min-h-[100px]"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Size Preset */}
          <Card>
            <CardHeader>
              <CardTitle>Size Preset</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sizePresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setSelectedPreset(preset.value)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all text-sm',
                      selectedPreset === preset.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{preset.label}</span>
                      {selectedPreset === preset.value && (
                        <Check className="w-3 h-3 text-primary" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{preset.dimensions}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Style */}
          <Card>
            <CardHeader>
              <CardTitle>Style</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {styles.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setSelectedStyle(style.value)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      selectedStyle === style.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{style.label}</span>
                      {selectedStyle === style.value && (
                        <Check className="w-3 h-3 text-primary" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{style.desc}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Category */}
          <Card>
            <CardHeader>
              <CardTitle>Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {designCategories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                      selectedCategory === cat.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Business Context */}
          <Card>
            <CardHeader>
              <CardTitle>Business Context (optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g. Tech startup, SaaS product, eco-friendly brand"
                value={businessContext}
                onChange={(e) => setBusinessContext(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Auto-filled from your business profile if available
              </p>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Design...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Design
              </>
            )}
          </Button>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <Card className="sticky top-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Preview
                </CardTitle>
                {generatedDesign && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHtml(!showHtml)}
                    >
                      <Code className="w-3 h-3 mr-1" />
                      {showHtml ? 'Preview' : 'Edit HTML'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRender}
                      disabled={rendering}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      {rendering ? 'Rendering...' : 'Render to PNG'}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!generatedDesign ? (
                <div className="flex flex-col items-center justify-center h-[500px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Palette className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-center">
                    Your generated design will appear here
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Describe your design and click Generate
                  </p>
                </div>
              ) : showHtml ? (
                <Textarea
                  className="font-mono text-xs min-h-[500px]"
                  value={generatedDesign.htmlContent || ''}
                  onChange={(e) =>
                    setGeneratedDesign({ ...generatedDesign, htmlContent: e.target.value })
                  }
                />
              ) : (
                <div className="border rounded-lg bg-white overflow-hidden">
                  <iframe
                    srcDoc={generatedDesign.htmlContent || '<p>No content</p>'}
                    className="w-full h-[500px] border-0"
                    sandbox="allow-same-origin"
                    title="Design Preview"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
