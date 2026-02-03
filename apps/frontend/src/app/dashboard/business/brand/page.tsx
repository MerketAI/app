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
  Palette, MessageSquare, Sparkles, FileText,
  CheckCircle, XCircle, Volume2
} from 'lucide-react';
import { AiFetchButton } from '@/components/ai-fetch';

interface BrandProfile {
  // Brand Voice & Tone
  brandVoice?: string;
  toneAttributes: string[];
  communicationStyle?: string;
  formality?: string;
  // Brand Personality
  brandPersonality?: string;
  brandArchetype?: string;
  personalityTraits: string[];
  // Messaging
  tagline?: string;
  elevatorPitch?: string;
  keyMessages: string[];
  // Content Guidelines
  writingStyle?: string;
  contentThemes: string[];
  topicsToAvoid: string[];
  // Visual Identity (descriptions)
  primaryColors?: string;
  secondaryColors?: string;
  fontStyle?: string;
  visualStyle?: string;
  // Do's and Don'ts
  brandDos: string[];
  brandDonts: string[];
  // Keywords & Phrases
  brandKeywords: string[];
  phraseExamples: string[];
}

const emptyBrandProfile: BrandProfile = {
  toneAttributes: [],
  personalityTraits: [],
  keyMessages: [],
  contentThemes: [],
  topicsToAvoid: [],
  brandDos: [],
  brandDonts: [],
  brandKeywords: [],
  phraseExamples: [],
};

const voiceStyles = [
  { value: 'professional', label: 'Professional', desc: 'Authoritative, knowledgeable, trustworthy' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm, approachable, conversational' },
  { value: 'playful', label: 'Playful', desc: 'Fun, witty, energetic' },
  { value: 'bold', label: 'Bold', desc: 'Confident, direct, assertive' },
  { value: 'inspirational', label: 'Inspirational', desc: 'Motivating, uplifting, empowering' },
  { value: 'educational', label: 'Educational', desc: 'Informative, helpful, clear' },
  { value: 'luxurious', label: 'Luxurious', desc: 'Sophisticated, elegant, premium' },
  { value: 'casual', label: 'Casual', desc: 'Relaxed, informal, down-to-earth' },
];

const toneOptions = [
  'Confident', 'Empathetic', 'Enthusiastic', 'Sincere', 'Witty',
  'Calm', 'Urgent', 'Optimistic', 'Reassuring', 'Bold',
  'Humble', 'Passionate', 'Thoughtful', 'Direct', 'Warm'
];

const formalityLevels = [
  { value: 'very_formal', label: 'Very Formal', desc: 'Academic, legal, corporate' },
  { value: 'formal', label: 'Formal', desc: 'Professional, business-like' },
  { value: 'neutral', label: 'Neutral', desc: 'Balanced, adaptable' },
  { value: 'casual', label: 'Casual', desc: 'Relaxed, conversational' },
  { value: 'very_casual', label: 'Very Casual', desc: 'Friendly, slang-friendly' },
];

const brandArchetypes = [
  { value: 'hero', label: 'The Hero', desc: 'Brave, determined, transformative' },
  { value: 'creator', label: 'The Creator', desc: 'Innovative, imaginative, artistic' },
  { value: 'caregiver', label: 'The Caregiver', desc: 'Nurturing, protective, supportive' },
  { value: 'ruler', label: 'The Ruler', desc: 'Authoritative, controlling, organized' },
  { value: 'jester', label: 'The Jester', desc: 'Fun, entertaining, lighthearted' },
  { value: 'sage', label: 'The Sage', desc: 'Wise, knowledgeable, thoughtful' },
  { value: 'magician', label: 'The Magician', desc: 'Transformative, visionary, inspiring' },
  { value: 'rebel', label: 'The Rebel', desc: 'Disruptive, bold, unconventional' },
  { value: 'lover', label: 'The Lover', desc: 'Passionate, intimate, sensual' },
  { value: 'everyman', label: 'The Everyman', desc: 'Relatable, honest, down-to-earth' },
  { value: 'innocent', label: 'The Innocent', desc: 'Pure, optimistic, simple' },
  { value: 'explorer', label: 'The Explorer', desc: 'Adventurous, independent, ambitious' },
];

const personalityOptions = [
  'Innovative', 'Trustworthy', 'Dynamic', 'Sophisticated', 'Approachable',
  'Authentic', 'Expert', 'Caring', 'Bold', 'Playful',
  'Reliable', 'Creative', 'Ambitious', 'Thoughtful', 'Energetic'
];

const writingStyles = [
  { value: 'concise', label: 'Concise', desc: 'Short sentences, to the point' },
  { value: 'detailed', label: 'Detailed', desc: 'Comprehensive, thorough explanations' },
  { value: 'storytelling', label: 'Storytelling', desc: 'Narrative-driven, engaging stories' },
  { value: 'data_driven', label: 'Data-Driven', desc: 'Facts, statistics, evidence-based' },
  { value: 'emotional', label: 'Emotional', desc: 'Feelings-focused, evocative' },
  { value: 'technical', label: 'Technical', desc: 'Industry terminology, precise' },
];

const visualStyles = [
  'Minimalist', 'Bold & Vibrant', 'Classic & Elegant', 'Modern & Clean',
  'Playful & Colorful', 'Dark & Sophisticated', 'Natural & Organic', 'Tech & Futuristic'
];

export default function BrandPage() {
  const [profile, setProfile] = useState<BrandProfile>(emptyBrandProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Input states
  const [messageInput, setMessageInput] = useState('');
  const [themeInput, setThemeInput] = useState('');
  const [avoidInput, setAvoidInput] = useState('');
  const [doInput, setDoInput] = useState('');
  const [dontInput, setDontInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [phraseInput, setPhraseInput] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await businessApi.getProfile();
      const data = response.data;

      // Map the profile data to brand fields
      setProfile({
        brandVoice: data.brandVoice || '',
        toneAttributes: data.toneAttributes || [],
        communicationStyle: data.communicationStyle || '',
        formality: data.formality || '',
        brandPersonality: data.brandPersonality || '',
        brandArchetype: data.brandArchetype || '',
        personalityTraits: data.personalityTraits || [],
        tagline: data.tagline || '',
        elevatorPitch: data.elevatorPitch || '',
        keyMessages: data.keyMessages || [],
        writingStyle: data.writingStyle || '',
        contentThemes: data.contentThemes || [],
        topicsToAvoid: data.topicsToAvoid || [],
        primaryColors: data.primaryColors || '',
        secondaryColors: data.secondaryColors || '',
        fontStyle: data.fontStyle || '',
        visualStyle: data.visualStyle || '',
        brandDos: data.brandDos || [],
        brandDonts: data.brandDonts || [],
        brandKeywords: data.brandKeywords || [],
        phraseExamples: data.phraseExamples || [],
      });
    } catch (error) {
      console.error('Failed to load brand profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await businessApi.updateProfile(profile);
      toast.success('Brand settings saved successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save brand settings');
    } finally {
      setSaving(false);
    }
  };

  const addToArray = (field: keyof BrandProfile, value: string, setValue: (v: string) => void) => {
    if (value.trim()) {
      const current = (profile[field] as string[]) || [];
      setProfile({
        ...profile,
        [field]: [...current, value.trim()],
      });
      setValue('');
    }
  };

  const removeFromArray = (field: keyof BrandProfile, index: number) => {
    const current = (profile[field] as string[]) || [];
    setProfile({
      ...profile,
      [field]: current.filter((_, i) => i !== index),
    });
  };

  const toggleArrayItem = (field: keyof BrandProfile, value: string) => {
    const current = (profile[field] as string[]) || [];
    if (current.includes(value)) {
      setProfile({
        ...profile,
        [field]: current.filter(v => v !== value),
      });
    } else {
      setProfile({
        ...profile,
        [field]: [...current, value],
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

  return (
    <div className="space-y-6">
      {/* Header with AI Fetch */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Brand Voice & Identity</h2>
          <p className="text-sm text-gray-500">Define your brand personality and communication style</p>
        </div>
        <AiFetchButton
          type="brand"
          context={{
            businessName: profile.businessName,
            businessDescription: profile.description,
            industry: profile.industry,
          }}
          onDataFetched={(data) => {
            if (data) {
              setProfile({
                ...profile,
                brandVoice: data.brandVoice || profile.brandVoice,
                toneAttributes: data.toneAttributes || profile.toneAttributes,
                brandPersonality: data.brandPersonality || profile.brandPersonality,
                brandArchetype: data.brandArchetype || profile.brandArchetype,
                tagline: data.tagline || profile.tagline,
                keyMessages: data.keyMessages || profile.keyMessages,
                contentThemes: data.contentThemes || profile.contentThemes,
                writingStyle: data.writingStyle || profile.writingStyle,
              });
              toast.success('Brand suggestions applied! Review and save your changes.');
            }
          }}
          buttonText="Generate Brand Voice with AI"
        />
      </div>

      {/* Brand Voice & Tone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Brand Voice & Tone
          </CardTitle>
          <CardDescription>
            Define how your brand speaks and communicates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Brand Voice Style</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {voiceStyles.map((style) => (
                <div
                  key={style.value}
                  onClick={() => setProfile({ ...profile, brandVoice: style.value })}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    profile.brandVoice === style.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{style.label}</div>
                  <div className="text-xs text-gray-500">{style.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tone Attributes (select all that apply)</Label>
            <div className="flex flex-wrap gap-2">
              {toneOptions.map((tone) => (
                <Badge
                  key={tone}
                  variant={(profile.toneAttributes || []).includes(tone) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleArrayItem('toneAttributes', tone)}
                >
                  {tone}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Formality Level</Label>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {formalityLevels.map((level) => (
                <div
                  key={level.value}
                  onClick={() => setProfile({ ...profile, formality: level.value })}
                  className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                    profile.formality === level.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">{level.label}</div>
                  <div className="text-xs text-gray-500">{level.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Personality */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Brand Personality
          </CardTitle>
          <CardDescription>
            Define your brand's character and archetype
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Brand Archetype</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {brandArchetypes.map((archetype) => (
                <div
                  key={archetype.value}
                  onClick={() => setProfile({ ...profile, brandArchetype: archetype.value })}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    profile.brandArchetype === archetype.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{archetype.label}</div>
                  <div className="text-xs text-gray-500">{archetype.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Personality Traits</Label>
            <div className="flex flex-wrap gap-2">
              {personalityOptions.map((trait) => (
                <Badge
                  key={trait}
                  variant={(profile.personalityTraits || []).includes(trait) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleArrayItem('personalityTraits', trait)}
                >
                  {trait}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Brand Personality Description</Label>
            <Textarea
              value={profile.brandPersonality || ''}
              onChange={(e) => setProfile({ ...profile, brandPersonality: e.target.value })}
              placeholder="Describe your brand's personality in your own words. If your brand were a person, how would you describe them?"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Key Messaging */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Key Messaging
          </CardTitle>
          <CardDescription>
            Core messages and positioning statements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tagline / Slogan</Label>
              <Input
                value={profile.tagline || ''}
                onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                placeholder="e.g., Just Do It, Think Different"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Elevator Pitch</Label>
            <Textarea
              value={profile.elevatorPitch || ''}
              onChange={(e) => setProfile({ ...profile, elevatorPitch: e.target.value })}
              placeholder="A brief, compelling description of what your business does and why it matters (30-60 seconds when spoken)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Key Brand Messages</Label>
            <div className="flex gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Add a key message..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('keyMessages', messageInput, setMessageInput))}
              />
              <Button onClick={() => addToArray('keyMessages', messageInput, setMessageInput)}>Add</Button>
            </div>
            <div className="space-y-2">
              {(profile.keyMessages || []).map((msg, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                  <span className="flex-1">{msg}</span>
                  <button onClick={() => removeFromArray('keyMessages', i)} className="text-gray-400 hover:text-red-500">×</button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Content Guidelines
          </CardTitle>
          <CardDescription>
            Writing style and content preferences for AI-generated content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Writing Style</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {writingStyles.map((style) => (
                <div
                  key={style.value}
                  onClick={() => setProfile({ ...profile, writingStyle: style.value })}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    profile.writingStyle === style.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{style.label}</div>
                  <div className="text-xs text-gray-500">{style.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Content Themes (topics you frequently cover)</Label>
            <div className="flex gap-2">
              <Input
                value={themeInput}
                onChange={(e) => setThemeInput(e.target.value)}
                placeholder="Add a content theme..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('contentThemes', themeInput, setThemeInput))}
              />
              <Button onClick={() => addToArray('contentThemes', themeInput, setThemeInput)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(profile.contentThemes || []).map((theme, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {theme}
                  <button onClick={() => removeFromArray('contentThemes', i)}>×</button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Topics to Avoid</Label>
            <div className="flex gap-2">
              <Input
                value={avoidInput}
                onChange={(e) => setAvoidInput(e.target.value)}
                placeholder="Add topic to avoid..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('topicsToAvoid', avoidInput, setAvoidInput))}
              />
              <Button onClick={() => addToArray('topicsToAvoid', avoidInput, setAvoidInput)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(profile.topicsToAvoid || []).map((topic, i) => (
                <Badge key={i} variant="outline" className="gap-1 text-red-600 border-red-200">
                  {topic}
                  <button onClick={() => removeFromArray('topicsToAvoid', i)}>×</button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Brand Keywords (words to use frequently)</Label>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Add keyword..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('brandKeywords', keywordInput, setKeywordInput))}
              />
              <Button onClick={() => addToArray('brandKeywords', keywordInput, setKeywordInput)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(profile.brandKeywords || []).map((kw, i) => (
                <Badge key={i} className="gap-1">
                  #{kw}
                  <button onClick={() => removeFromArray('brandKeywords', i)}>×</button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Example Phrases (phrases that represent your brand)</Label>
            <div className="flex gap-2">
              <Input
                value={phraseInput}
                onChange={(e) => setPhraseInput(e.target.value)}
                placeholder="Add example phrase..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('phraseExamples', phraseInput, setPhraseInput))}
              />
              <Button onClick={() => addToArray('phraseExamples', phraseInput, setPhraseInput)}>Add</Button>
            </div>
            <div className="space-y-1">
              {(profile.phraseExamples || []).map((phrase, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm italic">
                  <span className="flex-1">"{phrase}"</span>
                  <button onClick={() => removeFromArray('phraseExamples', i)} className="text-gray-400 hover:text-red-500">×</button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Do's and Don'ts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Brand Do's
            </CardTitle>
            <CardDescription>Things that align with your brand</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={doInput}
                onChange={(e) => setDoInput(e.target.value)}
                placeholder="Add a brand do..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('brandDos', doInput, setDoInput))}
              />
              <Button size="sm" onClick={() => addToArray('brandDos', doInput, setDoInput)}>Add</Button>
            </div>
            <div className="space-y-1">
              {(profile.brandDos || []).map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="flex-1">{item}</span>
                  <button onClick={() => removeFromArray('brandDos', i)} className="text-gray-400 hover:text-red-500">×</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Brand Don'ts
            </CardTitle>
            <CardDescription>Things to avoid in your brand</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={dontInput}
                onChange={(e) => setDontInput(e.target.value)}
                placeholder="Add a brand don't..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('brandDonts', dontInput, setDontInput))}
              />
              <Button size="sm" onClick={() => addToArray('brandDonts', dontInput, setDontInput)}>Add</Button>
            </div>
            <div className="space-y-1">
              {(profile.brandDonts || []).map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-red-50 rounded text-sm">
                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="flex-1">{item}</span>
                  <button onClick={() => removeFromArray('brandDonts', i)} className="text-gray-400 hover:text-red-500">×</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Visual Identity
          </CardTitle>
          <CardDescription>
            Describe your visual brand (helps AI understand your aesthetic)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Colors</Label>
              <Input
                value={profile.primaryColors || ''}
                onChange={(e) => setProfile({ ...profile, primaryColors: e.target.value })}
                placeholder="e.g., Deep blue (#1a365d), White"
              />
            </div>
            <div className="space-y-2">
              <Label>Secondary Colors</Label>
              <Input
                value={profile.secondaryColors || ''}
                onChange={(e) => setProfile({ ...profile, secondaryColors: e.target.value })}
                placeholder="e.g., Light gray, Gold accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Font Style</Label>
              <Input
                value={profile.fontStyle || ''}
                onChange={(e) => setProfile({ ...profile, fontStyle: e.target.value })}
                placeholder="e.g., Modern sans-serif, Classic serif"
              />
            </div>
            <div className="space-y-2">
              <Label>Visual Style</Label>
              <select
                value={profile.visualStyle || ''}
                onChange={(e) => setProfile({ ...profile, visualStyle: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select style</option>
                {visualStyles.map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? 'Saving...' : 'Save Brand Settings'}
        </Button>
      </div>
    </div>
  );
}
