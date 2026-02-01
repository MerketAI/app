'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Instagram,
  Facebook,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Image,
  Video,
  LayoutGrid,
  Clock,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { contentApi, platformsApi, publishingApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const platforms = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-purple-500 to-pink-500' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'from-blue-600 to-blue-500' },
  { id: 'blog', name: 'Blog Post', icon: FileText, color: 'from-green-500 to-teal-500' },
];

const contentTypes: Record<string, { id: string; name: string; icon: any; credits: number }[]> = {
  instagram: [
    { id: 'image_post', name: 'Image Post', icon: Image, credits: 5 },
    { id: 'carousel', name: 'Carousel', icon: LayoutGrid, credits: 8 },
    { id: 'video_post', name: 'Reel', icon: Video, credits: 15 },
  ],
  facebook: [
    { id: 'image_post', name: 'Image Post', icon: Image, credits: 5 },
    { id: 'video_post', name: 'Video Post', icon: Video, credits: 15 },
  ],
  blog: [
    { id: 'article', name: 'Blog Article', icon: FileText, credits: 10 },
  ],
};

const tones = ['professional', 'casual', 'humorous', 'inspirational'];
const lengths = ['short', 'medium', 'long'];

export default function CreateContentPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState('');
  const [contentType, setContentType] = useState('');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [editedContent, setEditedContent] = useState<any>(null);
  const [selectedConnection, setSelectedConnection] = useState('');

  const { data: connections } = useQuery({
    queryKey: ['platform-connections'],
    queryFn: () => platformsApi.getConnections().then((res) => res.data),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      contentApi.generate({
        platform,
        contentType,
        topic: topic || undefined,
        tone,
        length,
      }),
    onSuccess: (response) => {
      setGeneratedContent(response.data);
      setEditedContent(response.data.generated);
      setStep(3);
    },
    onError: (error: any) => {
      toast({
        title: 'Generation Failed',
        description: error.response?.data?.message || 'Failed to generate content',
        variant: 'destructive',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      publishingApi.publish(generatedContent.content.id, selectedConnection || undefined),
    onSuccess: () => {
      toast({ title: 'Content published successfully!' });
      router.push('/dashboard/content');
    },
    onError: (error: any) => {
      toast({
        title: 'Publishing Failed',
        description: error.response?.data?.message || 'Failed to publish content',
        variant: 'destructive',
      });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (scheduledAt: string) =>
      contentApi.schedule(generatedContent.content.id, {
        scheduledAt,
        connectionId: selectedConnection || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Content scheduled successfully!' });
      router.push('/dashboard/content');
    },
  });

  const filteredConnections = connections?.filter((c: any) => {
    if (platform === 'instagram') return c.platform === 'INSTAGRAM';
    if (platform === 'facebook') return c.platform === 'FACEBOOK';
    if (platform === 'blog') return c.platform === 'WORDPRESS';
    return false;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Content</h1>
        <p className="text-gray-500 mt-1">Generate AI-powered marketing content</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-center space-x-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              )}
            >
              {s}
            </div>
            {s < 3 && (
              <div className={cn('w-24 h-1 mx-2', step > s ? 'bg-primary' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Platform */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Platform</CardTitle>
            <CardDescription>Select where you want to publish your content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPlatform(p.id);
                    setContentType('');
                  }}
                  className={cn(
                    'p-6 rounded-xl border-2 transition-all text-left',
                    platform === p.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className={cn('w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center mb-4', p.color)}>
                    <p.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold">{p.name}</h3>
                </button>
              ))}
            </div>

            {platform && (
              <>
                <div className="pt-4">
                  <Label className="text-base font-medium mb-4 block">Content Type</Label>
                  <div className="grid md:grid-cols-3 gap-4">
                    {contentTypes[platform]?.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setContentType(type.id)}
                        className={cn(
                          'p-4 rounded-lg border-2 transition-all text-left',
                          contentType === type.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <type.icon className="w-5 h-5 mb-2 text-gray-600" />
                        <h4 className="font-medium">{type.name}</h4>
                        <p className="text-sm text-gray-500">{type.credits} credits</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)} disabled={!contentType}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Content Details */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Content Details</CardTitle>
            <CardDescription>Tell us about the content you want to create</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic or Subject (optional)</Label>
              <Input
                id="topic"
                placeholder="e.g., New product launch, Summer sale, Tips for..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <p className="text-sm text-gray-500">Leave empty for AI to suggest trending topics</p>
            </div>

            <div className="space-y-2">
              <Label>Tone</Label>
              <div className="flex flex-wrap gap-2">
                {tones.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={cn(
                      'px-4 py-2 rounded-full border capitalize transition-all',
                      tone === t
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Length</Label>
              <div className="flex flex-wrap gap-2">
                {lengths.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLength(l)}
                    className={cn(
                      'px-4 py-2 rounded-full border capitalize transition-all',
                      length === l
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Content
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Publish */}
      {step === 3 && editedContent && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Publish</CardTitle>
            <CardDescription>Review your generated content and publish or schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preview */}
            <div className="border rounded-lg p-6 bg-gray-50">
              {platform === 'blog' ? (
                <>
                  <h2 className="text-2xl font-bold mb-4">{editedContent.title}</h2>
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: editedContent.body?.replace(/\n/g, '<br>') }}
                  />
                </>
              ) : (
                <>
                  <p className="whitespace-pre-wrap">{editedContent.caption}</p>
                  {editedContent.hashtags?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {editedContent.hashtags.map((tag: string, i: number) => (
                        <span key={i} className="text-primary">#{tag}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Edit option */}
            <div className="space-y-2">
              <Label>Edit Caption/Content</Label>
              <textarea
                className="w-full min-h-[150px] p-3 border rounded-lg"
                value={platform === 'blog' ? editedContent.body : editedContent.caption}
                onChange={(e) =>
                  setEditedContent({
                    ...editedContent,
                    [platform === 'blog' ? 'body' : 'caption']: e.target.value,
                  })
                }
              />
            </div>

            {/* Platform connection */}
            {filteredConnections && filteredConnections.length > 0 && (
              <div className="space-y-2">
                <Label>Publish to</Label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={selectedConnection}
                  onChange={(e) => setSelectedConnection(e.target.value)}
                >
                  <option value="">Select account</option>
                  {filteredConnections.map((conn: any) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.accountName} ({conn.platform})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const date = new Date();
                    date.setHours(date.getHours() + 24);
                    scheduleMutation.mutate(date.toISOString());
                  }}
                  disabled={scheduleMutation.isPending}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Schedule
                </Button>
                <Button
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending || !selectedConnection}
                >
                  {publishMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Publish Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
