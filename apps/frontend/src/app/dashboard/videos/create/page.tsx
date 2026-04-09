'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShoppingBag,
  MessageSquare,
  Lightbulb,
  Megaphone,
  Sparkles,
  Film,
  User,
  Monitor,
  Smartphone,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { videoApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const VIDEO_TYPES = [
  {
    value: 'PRODUCT_SHOWCASE',
    label: 'Product Showcase',
    description: 'Highlight your product features with dynamic visuals',
    icon: ShoppingBag,
  },
  {
    value: 'TESTIMONIAL',
    label: 'Testimonial',
    description: 'Create authentic customer testimonial videos',
    icon: MessageSquare,
  },
  {
    value: 'EXPLAINER',
    label: 'Explainer',
    description: 'Break down complex topics into engaging explanations',
    icon: Lightbulb,
  },
  {
    value: 'SOCIAL_AD',
    label: 'Social Ad',
    description: 'Short-form ads optimized for social media platforms',
    icon: Megaphone,
  },
  {
    value: 'PROMO',
    label: 'Promo',
    description: 'Promotional videos for campaigns and launches',
    icon: Sparkles,
  },
];

const PROVIDERS = [
  {
    value: 'RUNWAY',
    label: 'Runway ML',
    description: 'AI-powered video generation with cinematic quality. Best for visual effects and creative content.',
    icon: Film,
  },
  {
    value: 'HEYGEN',
    label: 'HeyGen',
    description: 'AI avatar-based video creation. Best for talking-head videos and presentations.',
    icon: User,
  },
];

const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 Landscape', icon: Monitor },
  { value: '9:16', label: '9:16 Portrait', icon: Smartphone },
];

const DURATIONS = [
  { value: '5', label: '5 seconds' },
  { value: '10', label: '10 seconds' },
];

const STEPS = ['Type & Provider', 'Content', 'Review & Generate'];

export default function CreateVideoPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [videoType, setVideoType] = useState('');
  const [provider, setProvider] = useState('');
  const [prompt, setPrompt] = useState('');
  const [scriptContent, setScriptContent] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState('5');
  const [style, setStyle] = useState('');

  const { data: providersData } = useQuery({
    queryKey: ['video-providers'],
    queryFn: () => videoApi.getProviders().then((res) => res.data),
  });

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const pollStatus = useCallback(
    (projectId: string) => {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await videoApi.checkStatus(projectId);
          const status = res.data?.status || res.data?.project?.status;
          if (status === 'COMPLETED') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsGenerating(false);
            toast.success('Video generated successfully!');
            router.push(`/dashboard/videos/${projectId}`);
          } else if (status === 'FAILED') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsGenerating(false);
            toast.error('Video generation failed');
            router.push(`/dashboard/videos/${projectId}`);
          }
        } catch {
          // Continue polling on error
        }
      }, 5000);
    },
    [router]
  );

  const canProceed = () => {
    if (step === 0) return videoType !== '' && provider !== '' && name !== '';
    if (step === 1) return prompt !== '';
    return true;
  };

  const handleCreateDraft = async () => {
    setIsCreating(true);
    try {
      const settings = JSON.stringify({ aspectRatio, duration: parseInt(duration), style: style || undefined });
      const res = await videoApi.createProject({
        name,
        type: videoType,
        provider,
        prompt,
        scriptContent: scriptContent || undefined,
        settings,
      });
      const projectId = res.data?.id || res.data?.project?.id;
      toast.success('Video project created as draft');
      router.push(`/dashboard/videos/${projectId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateAndGenerate = async () => {
    setIsCreating(true);
    try {
      const settings = JSON.stringify({ aspectRatio, duration: parseInt(duration), style: style || undefined });
      const res = await videoApi.createProject({
        name,
        type: videoType,
        provider,
        prompt,
        scriptContent: scriptContent || undefined,
        settings,
      });
      const projectId = res.data?.id || res.data?.project?.id;
      setCreatedProjectId(projectId);
      setIsCreating(false);
      setIsGenerating(true);

      await videoApi.generateVideo(projectId);
      toast.success('Video generation started!');
      pollStatus(projectId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create and generate');
      setIsCreating(false);
      setIsGenerating(false);
    }
  };

  const formatType = (type: string) =>
    VIDEO_TYPES.find((t) => t.value === type)?.label || type;

  const formatProvider = (p: string) =>
    PROVIDERS.find((pr) => pr.value === p)?.label || p;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/videos')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Video</h1>
          <p className="text-gray-500 mt-1">Set up a new AI video project</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                i < step
                  ? 'bg-primary text-primary-foreground'
                  : i === step
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-200 text-gray-500'
              )}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn('text-sm', i === step ? 'font-medium' : 'text-gray-500')}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Type & Provider */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input
              placeholder="My video project"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Video Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VIDEO_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.value}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      videoType === type.value
                        ? 'ring-2 ring-primary border-primary'
                        : 'hover:border-gray-300'
                    )}
                    onClick={() => setVideoType(type.value)}
                  >
                    <CardContent className="flex items-start gap-3 p-4">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                          videoType === type.value ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{type.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Provider</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROVIDERS.map((p) => {
                const Icon = p.icon;
                return (
                  <Card
                    key={p.value}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      provider === p.value
                        ? 'ring-2 ring-primary border-primary'
                        : 'hover:border-gray-300'
                    )}
                    onClick={() => setProvider(p.value)}
                  >
                    <CardContent className="flex items-start gap-3 p-4">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                          provider === p.value ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{p.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Content */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Prompt / Description</Label>
            <Textarea
              placeholder="Describe the video you want to create..."
              className="min-h-[120px]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Be specific about visuals, tone, and key messages you want in the video.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Script Content (optional)</Label>
            <Textarea
              placeholder="Write or paste your video script here..."
              className="min-h-[100px]"
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map((ar) => {
                  const Icon = ar.icon;
                  return (
                    <Button
                      key={ar.value}
                      variant={aspectRatio === ar.value ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setAspectRatio(ar.value)}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {ar.value}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Style (optional)</Label>
              <Input
                placeholder="e.g. cinematic, minimal"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 2 && (
        <div className="space-y-6">
          {isGenerating ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <div className="text-center">
                  <h3 className="text-lg font-medium">Generating your video...</h3>
                  <p className="text-gray-500 mt-1">
                    This may take a few minutes. We will check the status automatically.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Review Your Video Project</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Project Name</p>
                    <p className="font-medium">{name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Video Type</p>
                    <Badge variant="secondary">{formatType(videoType)}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Provider</p>
                    <Badge variant="secondary">{formatProvider(provider)}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Aspect Ratio</p>
                    <p className="font-medium">{aspectRatio}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-medium">{duration} seconds</p>
                  </div>
                  {style && (
                    <div>
                      <p className="text-sm text-gray-500">Style</p>
                      <p className="font-medium">{style}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Prompt</p>
                  <p className="text-sm bg-gray-50 rounded-md p-3">{prompt}</p>
                </div>

                {scriptContent && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Script</p>
                    <p className="text-sm bg-gray-50 rounded-md p-3 whitespace-pre-wrap">
                      {scriptContent}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Navigation */}
      {!isGenerating && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => (step === 0 ? router.push('/dashboard/videos') : setStep(step - 1))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>

          <div className="flex gap-2">
            {step < 2 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleCreateDraft} disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Create Draft
                </Button>
                <Button onClick={handleCreateAndGenerate} disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Create & Generate
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
