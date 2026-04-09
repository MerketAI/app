'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Clock,
  Eye,
  Mail,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { emailApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const steps = ['Details', 'Content', 'Review & Send'];

export default function CreateCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    subject: '',
    previewText: '',
    listId: '',
    htmlContent: '',
  });

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const res = await emailApi.getLists();
        setLists(res.data?.lists || res.data || []);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to load email lists');
      }
    };
    fetchLists();
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (currentStep === 0) {
      return form.name.trim() && form.subject.trim() && form.listId;
    }
    if (currentStep === 1) {
      return form.htmlContent.trim();
    }
    return true;
  };

  const handleCreateAndSend = async () => {
    setSending(true);
    try {
      let campaignId = createdCampaignId;
      if (!campaignId) {
        const res = await emailApi.createCampaign({
          name: form.name,
          subject: form.subject,
          previewText: form.previewText,
          listId: form.listId,
          htmlContent: form.htmlContent,
        });
        campaignId = res.data.id;
        setCreatedCampaignId(campaignId);
      }
      await emailApi.sendCampaign(campaignId!);
      toast.success('Campaign sent successfully!');
      router.push('/dashboard/email');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDate) return;
    setSending(true);
    try {
      let campaignId = createdCampaignId;
      if (!campaignId) {
        const res = await emailApi.createCampaign({
          name: form.name,
          subject: form.subject,
          previewText: form.previewText,
          listId: form.listId,
          htmlContent: form.htmlContent,
          scheduledAt: scheduleDate,
        });
        campaignId = res.data.id;
        setCreatedCampaignId(campaignId);
      } else {
        await emailApi.updateCampaign(campaignId, { scheduledAt: scheduleDate });
      }
      toast.success('Campaign scheduled!');
      setShowScheduleModal(false);
      router.push('/dashboard/email');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to schedule campaign');
    } finally {
      setSending(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) return;
    setSendingTest(true);
    try {
      let campaignId = createdCampaignId;
      if (!campaignId) {
        const res = await emailApi.createCampaign({
          name: form.name,
          subject: form.subject,
          previewText: form.previewText,
          listId: form.listId,
          htmlContent: form.htmlContent,
        });
        campaignId = res.data.id;
        setCreatedCampaignId(campaignId);
      }
      await emailApi.sendTestEmail(campaignId!, { email: testEmail });
      toast.success(`Test email sent to ${testEmail}`);
      setShowTestModal(false);
      setTestEmail('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  const selectedList = lists.find((l) => l.id === form.listId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/email">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Campaign</h1>
          <p className="text-gray-500 mt-1">Set up and send an email campaign</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <button
              onClick={() => index < currentStep && setCurrentStep(index)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                index === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : index < currentStep
                  ? 'bg-green-100 text-green-700 cursor-pointer'
                  : 'bg-gray-100 text-gray-400'
              )}
            >
              {index < currentStep ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs">
                  {index + 1}
                </span>
              )}
              {step}
            </button>
            {index < steps.length - 1 && (
              <div className="w-8 h-px bg-gray-300 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Details */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                placeholder="e.g. Summer Sale Announcement"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                placeholder="e.g. Don't miss our biggest sale of the year!"
                value={form.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="previewText">Preview Text (optional)</Label>
              <Input
                id="previewText"
                placeholder="Text shown after the subject line in inbox..."
                value={form.previewText}
                onChange={(e) => handleChange('previewText', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="listId">Email List</Label>
              <select
                id="listId"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.listId}
                onChange={(e) => handleChange('listId', e.target.value)}
              >
                <option value="">Select a list...</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name} ({list.contactCount ?? list._count?.contacts ?? 0} contacts)
                  </option>
                ))}
              </select>
              {lists.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  No lists found.{' '}
                  <Link href="/dashboard/email/lists" className="text-primary underline">
                    Create one first
                  </Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Content */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Email HTML Content</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste or write your email HTML content here..."
                className="font-mono text-sm min-h-[400px]"
                value={form.htmlContent}
                onChange={(e) => handleChange('htmlContent', e.target.value)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg bg-white min-h-[400px] overflow-auto">
                {form.htmlContent ? (
                  <div
                    className="p-4"
                    dangerouslySetInnerHTML={{ __html: form.htmlContent }}
                    style={{ all: 'initial', fontFamily: 'sans-serif' }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-gray-400">
                    HTML preview will appear here
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Review & Send */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Campaign Name</p>
                  <p className="font-medium">{form.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Subject Line</p>
                  <p className="font-medium">{form.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Preview Text</p>
                  <p className="font-medium">{form.previewText || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email List</p>
                  <p className="font-medium">
                    {selectedList?.name || '-'} ({selectedList?.contactCount ?? selectedList?._count?.contacts ?? 0} contacts)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Email Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg bg-white max-h-[300px] overflow-auto">
                {form.htmlContent ? (
                  <div
                    className="p-4"
                    dangerouslySetInnerHTML={{ __html: form.htmlContent }}
                    style={{ all: 'initial', fontFamily: 'sans-serif' }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-gray-400">
                    No content
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowTestModal(true)}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Test
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowScheduleModal(true)}
            >
              <Clock className="w-4 h-4 mr-2" />
              Schedule
            </Button>
            <Button onClick={handleCreateAndSend} disabled={sending}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Now'}
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => s - 1)}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        {currentStep < steps.length - 1 && (
          <Button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Test Email Modal */}
      <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test version of this campaign to verify how it looks.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="test-email">Email Address</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="your@email.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendTest} disabled={sendingTest || !testEmail.trim()}>
              {sendingTest ? 'Sending...' : 'Send Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Campaign</DialogTitle>
            <DialogDescription>
              Choose when to send this campaign.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="schedule-date">Send Date & Time</Label>
            <Input
              id="schedule-date"
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={sending || !scheduleDate}>
              {sending ? 'Scheduling...' : 'Schedule Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
