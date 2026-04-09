'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Play,
  Pause,
  GitBranch,
  Clock,
  Mail,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Edit,
  Save,
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

interface SequenceStep {
  delayDays: number;
  subject: string;
  htmlContent: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  DRAFT: 'bg-gray-100 text-gray-700',
};

const triggerTypes = [
  { value: 'SUBSCRIPTION', label: 'On Subscription' },
  { value: 'TAG_ADDED', label: 'Tag Added' },
  { value: 'MANUAL', label: 'Manual Enrollment' },
  { value: 'FORM_SUBMISSION', label: 'Form Submission' },
];

export default function EmailSequencesPage() {
  const [sequences, setSequences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create/Edit state
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formTrigger, setFormTrigger] = useState('MANUAL');
  const [formSteps, setFormSteps] = useState<SequenceStep[]>([
    { delayDays: 0, subject: '', htmlContent: '' },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSequences();
  }, []);

  const fetchSequences = async () => {
    setLoading(true);
    try {
      const res = await emailApi.getSequences();
      setSequences(res.data?.sequences || res.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load sequences');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormTrigger('MANUAL');
    setFormSteps([{ delayDays: 0, subject: '', htmlContent: '' }]);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (seq: any) => {
    setFormName(seq.name);
    setFormTrigger(seq.triggerType || 'MANUAL');
    setFormSteps(
      seq.steps?.length
        ? seq.steps.map((s: any) => ({
            delayDays: s.delayDays ?? 0,
            subject: s.subject || '',
            htmlContent: s.htmlContent || '',
          }))
        : [{ delayDays: 0, subject: '', htmlContent: '' }]
    );
    setEditingId(seq.id);
    setCreateOpen(true);
  };

  const addStep = () => {
    setFormSteps((prev) => [...prev, { delayDays: 1, subject: '', htmlContent: '' }]);
  };

  const removeStep = (index: number) => {
    if (formSteps.length <= 1) return;
    setFormSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof SequenceStep, value: any) => {
    setFormSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, [field]: value } : step))
    );
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Sequence name is required');
      return;
    }
    if (formSteps.some((s) => !s.subject.trim())) {
      toast.error('All steps need a subject line');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName,
        triggerType: formTrigger,
        steps: formSteps,
      };

      if (editingId) {
        await emailApi.updateSequence(editingId, payload);
        toast.success('Sequence updated');
      } else {
        await emailApi.createSequence(payload);
        toast.success('Sequence created');
      }
      setCreateOpen(false);
      resetForm();
      fetchSequences();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save sequence');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await emailApi.activateSequence(id);
      toast.success('Sequence activated');
      setSequences(sequences.map((s) => (s.id === id ? { ...s, status: 'ACTIVE' } : s)));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to activate sequence');
    }
  };

  const handlePause = async (id: string) => {
    try {
      await emailApi.pauseSequence(id);
      toast.success('Sequence paused');
      setSequences(sequences.map((s) => (s.id === id ? { ...s, status: 'PAUSED' } : s)));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to pause sequence');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await emailApi.deleteSequence(id);
      toast.success('Sequence deleted');
      setSequences(sequences.filter((s) => s.id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete sequence');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/email">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Email Sequences</h1>
          <p className="text-gray-500 mt-1">Create automated drip email sequences</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Sequence
        </Button>
      </div>

      {sequences.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No email sequences yet</p>
            <Button onClick={openCreate}>Create your first sequence</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sequences.map((seq) => (
            <Card key={seq.id}>
              <CardContent className="p-0">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === seq.id ? null : seq.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedId === seq.id ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <div>
                      <h3 className="font-medium">{seq.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs rounded font-medium',
                            statusColors[seq.status] || 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {seq.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {seq.triggerType || 'Manual'} trigger
                        </span>
                        <span className="text-xs text-gray-500">
                          {seq.steps?.length ?? seq.stepCount ?? 0} steps
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {seq.status === 'ACTIVE' ? (
                      <Button variant="outline" size="sm" onClick={() => handlePause(seq.id)}>
                        <Pause className="w-3 h-3 mr-1" />
                        Pause
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleActivate(seq.id)}>
                        <Play className="w-3 h-3 mr-1" />
                        Activate
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(seq)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(seq.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {/* Visual Timeline */}
                {expandedId === seq.id && seq.steps?.length > 0 && (
                  <div className="border-t px-4 py-6">
                    <div className="relative pl-8">
                      {seq.steps.map((step: any, index: number) => (
                        <div key={index} className="relative mb-6 last:mb-0">
                          {/* Timeline line */}
                          {index < seq.steps.length - 1 && (
                            <div className="absolute left-[-20px] top-6 w-px h-full bg-gray-200" />
                          )}
                          {/* Timeline dot */}
                          <div className="absolute left-[-24px] top-1 w-2 h-2 rounded-full bg-primary" />

                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              {index === 0 ? (
                                <span className="text-xs text-gray-500">Immediately</span>
                              ) : (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  After {step.delayDays} day{step.delayDays !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium">{step.subject}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Sequence Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Sequence' : 'Create Sequence'}</DialogTitle>
            <DialogDescription>
              Define the steps and timing for your automated email sequence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="seq-name">Sequence Name</Label>
                <Input
                  id="seq-name"
                  placeholder="e.g. Welcome Series"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="seq-trigger">Trigger Type</Label>
                <select
                  id="seq-trigger"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={formTrigger}
                  onChange={(e) => setFormTrigger(e.target.value)}
                >
                  {triggerTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Sequence Steps</Label>
                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Step
                </Button>
              </div>

              <div className="space-y-4">
                {formSteps.map((step, index) => (
                  <Card key={index}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">
                          Step {index + 1}
                        </span>
                        {formSteps.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeStep(index)}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Delay (days)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={step.delayDays}
                            onChange={(e) =>
                              updateStep(index, 'delayDays', parseInt(e.target.value) || 0)
                            }
                          />
                          <p className="text-xs text-gray-400 mt-0.5">
                            {index === 0 ? 'Days after trigger' : 'Days after previous step'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs">Subject Line</Label>
                          <Input
                            placeholder="Email subject..."
                            value={step.subject}
                            onChange={(e) => updateStep(index, 'subject', e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">HTML Content</Label>
                        <Textarea
                          placeholder="Email HTML content..."
                          className="font-mono text-xs min-h-[80px]"
                          value={step.htmlContent}
                          onChange={(e) => updateStep(index, 'htmlContent', e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : editingId ? 'Update Sequence' : 'Create Sequence'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
