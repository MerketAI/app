'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { leadsApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn, formatDate } from '@/lib/utils';
import {
  Plus,
  Search,
  Users,
  LayoutGrid,
  List,
  TrendingUp,
  Target,
  BarChart3,
  GripVertical,
  Mail,
  Phone,
  Building2,
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
  createdAt: string;
}

interface LeadStats {
  total: number;
  conversionRate: number;
  avgScore: number;
  byStage: Record<string, number>;
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

const SOURCES = ['Website', 'Referral', 'Social Media', 'Email', 'Cold Call', 'Event', 'Ads', 'Other'];

const stageColorMap: Record<string, string> = Object.fromEntries(
  STAGES.map((s) => [s.value, s.color])
);

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-700';
  if (score >= 50) return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-700';
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    tags: '',
  });

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [search, sourceFilter]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await leadsApi.getLeads({
        search: search || undefined,
        source: sourceFilter || undefined,
        limit: 200,
      });
      setLeads(response.data.leads || response.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await leadsApi.getStats();
      setStats(response.data);
    } catch {
      // Stats may not be available
    }
  };

  const handleAddLead = async () => {
    if (!newLead.name || !newLead.email) {
      toast.error('Name and email are required');
      return;
    }
    try {
      setAddLoading(true);
      await leadsApi.createLead({
        name: newLead.name,
        email: newLead.email,
        phone: newLead.phone || undefined,
        company: newLead.company || undefined,
        source: newLead.source || undefined,
        tags: newLead.tags ? newLead.tags.split(',').map((t) => t.trim()) : undefined,
      });
      toast.success('Lead added successfully');
      setShowAddDialog(false);
      setNewLead({ name: '', email: '', phone: '', company: '', source: '', tags: '' });
      fetchLeads();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add lead');
    } finally {
      setAddLoading(false);
    }
  };

  const handleChangeStage = async (leadId: string, newStage: string) => {
    try {
      await leadsApi.changeStage(leadId, { stage: newStage });
      toast.success('Stage updated');
      fetchLeads();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update stage');
    }
  };

  const getLeadsByStage = (stage: string) =>
    leads.filter((l) => l.stage === stage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-gray-500 mt-1">Manage your sales pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <button
              className={cn(
                'px-3 py-2 text-sm',
                view === 'kanban' ? 'bg-primary text-primary-foreground' : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
              onClick={() => setView('kanban')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              className={cn(
                'px-3 py-2 text-sm',
                view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
              onClick={() => setView('list')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="Full name"
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    className="mt-1.5"
                    type="email"
                    placeholder="email@example.com"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="Phone number"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="Company name"
                    value={newLead.company}
                    onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Source</Label>
                  <select
                    className="mt-1.5 w-full border rounded-md px-3 py-2 text-sm"
                    value={newLead.source}
                    onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                  >
                    <option value="">Select source</option>
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="e.g., priority, enterprise"
                    value={newLead.tags}
                    onChange={(e) => setNewLead({ ...newLead, tags: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddLead} disabled={addLoading}>
                    {addLoading ? 'Adding...' : 'Add Lead'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Total Leads</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold">{(stats.conversionRate * 100).toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Target className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-500">Avg Score</p>
                <p className="text-2xl font-bold">{stats.avgScore?.toFixed(0) || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-500">In Pipeline</p>
                <p className="text-2xl font-bold">
                  {(stats.byStage?.NEW || 0) +
                    (stats.byStage?.CONTACTED || 0) +
                    (stats.byStage?.QUALIFIED || 0) +
                    (stats.byStage?.PROPOSAL || 0) +
                    (stats.byStage?.NEGOTIATION || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search leads..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="">All Sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No leads yet</h3>
            <p className="text-gray-400 mb-4 text-center max-w-md">
              Start building your pipeline by adding your first lead.
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </CardContent>
        </Card>
      ) : view === 'kanban' ? (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageLeads = getLeadsByStage(stage.value);
            return (
              <div key={stage.value} className="flex-shrink-0 w-72">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className={cn('px-2 py-0.5 text-xs rounded-full font-medium', stage.color)}>
                    {stage.label}
                  </span>
                  <span className="text-xs text-gray-400">{stageLeads.length}</span>
                </div>
                <div className="space-y-3 min-h-[200px] bg-gray-50 rounded-lg p-2">
                  {stageLeads.map((lead) => (
                    <Link key={lead.id} href={`/dashboard/leads/${lead.id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer mb-3">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium text-sm truncate">{lead.name}</p>
                            {lead.score !== undefined && lead.score !== null && (
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 text-xs rounded font-medium ml-2 flex-shrink-0',
                                  getScoreColor(lead.score)
                                )}
                              >
                                {lead.score}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                            {lead.company && (
                              <div className="flex items-center gap-1 truncate">
                                <Building2 className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{lead.company}</span>
                              </div>
                            )}
                          </div>
                          {lead.source && (
                            <Badge variant="outline" className="text-xs mt-2">
                              {lead.source}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                  {stageLeads.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-8">No leads</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Name</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Email</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Company</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Stage</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Score</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Source</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="font-medium text-sm hover:underline"
                      >
                        {lead.name}
                      </Link>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{lead.email}</td>
                    <td className="p-4 text-sm text-gray-600">{lead.company || '-'}</td>
                    <td className="p-4">
                      <select
                        className="text-xs border rounded px-2 py-1"
                        value={lead.stage}
                        onChange={(e) => handleChangeStage(lead.id, e.target.value)}
                      >
                        {STAGES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      {lead.score !== undefined && lead.score !== null ? (
                        <span className={cn('px-2 py-0.5 text-xs rounded font-medium', getScoreColor(lead.score))}>
                          {lead.score}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {lead.source ? (
                        <Badge variant="outline" className="text-xs">{lead.source}</Badge>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500">{formatDate(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
