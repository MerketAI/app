'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { leadsApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Save,
  Trash2,
  Send,
  MessageSquare,
  Clock,
  User,
  Tag,
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  stage: string;
  source?: string;
  score?: number;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  author?: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

const STAGES = [
  { value: 'NEW', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'QUALIFIED', label: 'Qualified', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'PROPOSAL', label: 'Proposal', color: 'bg-purple-100 text-purple-700' },
  { value: 'NEGOTIATION', label: 'Negotiation', color: 'bg-orange-100 text-orange-700' },
  { value: 'CONVERTED', label: 'Converted', color: 'bg-green-100 text-green-700' },
  { value: 'LOST', label: 'Lost', color: 'bg-red-100 text-red-700' },
];

const stageColorMap: Record<string, string> = Object.fromEntries(
  STAGES.map((s) => [s.value, s.color])
);

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-700';
  if (score >= 50) return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-700';
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'STAGE_CHANGE':
      return <Tag className="w-4 h-4 text-purple-500" />;
    case 'NOTE_ADDED':
      return <MessageSquare className="w-4 h-4 text-blue-500" />;
    case 'EMAIL_SENT':
      return <Mail className="w-4 h-4 text-green-500" />;
    case 'CALL':
      return <Phone className="w-4 h-4 text-orange-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    tags: '',
  });

  useEffect(() => {
    fetchLead();
    fetchActivities();
  }, [id]);

  const fetchLead = async () => {
    try {
      setLoading(true);
      const response = await leadsApi.getLead(id);
      const data = response.data;
      setLead(data);
      setEditForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        company: data.company || '',
        source: data.source || '',
        tags: data.tags?.join(', ') || '',
      });
      setNotes(data.notes || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await leadsApi.getActivities(id, { limit: 50 });
      setActivities(response.data.activities || response.data || []);
    } catch {
      // Activities may not be available
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await leadsApi.updateLead(id, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || undefined,
        company: editForm.company || undefined,
        source: editForm.source || undefined,
        tags: editForm.tags ? editForm.tags.split(',').map((t) => t.trim()) : undefined,
      });
      toast.success('Lead updated');
      fetchLead();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStage = async (newStage: string) => {
    try {
      await leadsApi.changeStage(id, { stage: newStage });
      toast.success('Stage updated');
      fetchLead();
      fetchActivities();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update stage');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      setAddingNote(true);
      await leadsApi.addNote(id, { content: newNote.trim() });
      toast.success('Note added');
      setNewNote('');
      fetchLead();
      fetchActivities();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return;
    try {
      await leadsApi.deleteLead(id);
      toast.success('Lead deleted');
      router.push('/dashboard/leads');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete lead');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Lead not found</p>
        <Button className="mt-4" onClick={() => router.push('/dashboard/leads')}>
          Back to Leads
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/leads')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{lead.name}</h1>
              <span
                className={cn(
                  'px-2.5 py-0.5 text-xs rounded-full font-medium',
                  stageColorMap[lead.stage] || 'bg-gray-100 text-gray-700'
                )}
              >
                {STAGES.find((s) => s.value === lead.stage)?.label || lead.stage}
              </span>
              {lead.score !== undefined && lead.score !== null && (
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs rounded font-medium',
                    getScoreColor(lead.score)
                  )}
                >
                  Score: {lead.score}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {lead.email}
              </span>
              {lead.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {lead.phone}
                </span>
              )}
              {lead.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {lead.company}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={lead.stage}
            onChange={(e) => handleChangeStage(e.target.value)}
          >
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 hover:border-red-300"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    className="mt-1.5"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    className="mt-1.5"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    className="mt-1.5"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input
                    className="mt-1.5"
                    value={editForm.company}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Source</Label>
                  <select
                    className="mt-1.5 w-full border rounded-md px-3 py-2 text-sm"
                    value={editForm.source}
                    onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                  >
                    <option value="">Select source</option>
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Email">Email</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="Event">Event</option>
                    <option value="Ads">Ads</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    className="mt-1.5"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    placeholder="e.g., priority, enterprise"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-1" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                />
                <Button onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDateTime(note.createdAt)}
                        {note.author && ` by ${note.author}`}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No notes yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Activity Timeline */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDateTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Created</dt>
                  <dd>{formatDate(lead.createdAt)}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Last Updated</dt>
                  <dd>{formatDate(lead.updatedAt)}</dd>
                </div>
                {lead.source && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Source</dt>
                    <dd>{lead.source}</dd>
                  </div>
                )}
                {lead.tags && lead.tags.length > 0 && (
                  <div className="pt-2">
                    <dt className="text-sm text-gray-500 mb-1">Tags</dt>
                    <dd className="flex flex-wrap gap-1">
                      {lead.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
