'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  Plus,
  Send,
  Users,
  GitBranch,
  Trash2,
  Play,
  Pause,
  BarChart3,
  MousePointerClick,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { emailApi } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

const campaignStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  SENDING: 'bg-yellow-100 text-yellow-700',
  SENT: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

const sequenceStatusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  DRAFT: 'bg-gray-100 text-gray-700',
};

export default function EmailPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [sequences, setSequences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createListOpen, setCreateListOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, listsRes, sequencesRes] = await Promise.all([
        emailApi.getCampaigns(),
        emailApi.getLists(),
        emailApi.getSequences(),
      ]);
      setCampaigns(campaignsRes.data?.campaigns || campaignsRes.data || []);
      setLists(listsRes.data?.lists || listsRes.data || []);
      setSequences(sequencesRes.data?.sequences || sequencesRes.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load email data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setCreatingList(true);
    try {
      await emailApi.createList({ name: newListName, description: newListDescription });
      toast.success('Email list created');
      setCreateListOpen(false);
      setNewListName('');
      setNewListDescription('');
      const res = await emailApi.getLists();
      setLists(res.data?.lists || res.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create list');
    } finally {
      setCreatingList(false);
    }
  };

  const handleDeleteList = async (id: string) => {
    try {
      await emailApi.deleteList(id);
      toast.success('List deleted');
      setLists(lists.filter((l) => l.id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete list');
    }
  };

  const handleActivateSequence = async (id: string) => {
    try {
      await emailApi.activateSequence(id);
      toast.success('Sequence activated');
      setSequences(sequences.map((s) => (s.id === id ? { ...s, status: 'ACTIVE' } : s)));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to activate sequence');
    }
  };

  const handlePauseSequence = async (id: string) => {
    try {
      await emailApi.pauseSequence(id);
      toast.success('Sequence paused');
      setSequences(sequences.map((s) => (s.id === id ? { ...s, status: 'PAUSED' } : s)));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to pause sequence');
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
      <div>
        <h1 className="text-3xl font-bold">Email Marketing</h1>
        <p className="text-gray-500 mt-1">Manage campaigns, lists, and automated sequences</p>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">
            <Send className="w-4 h-4 mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="lists">
            <Users className="w-4 h-4 mr-2" />
            Lists
          </TabsTrigger>
          <TabsTrigger value="sequences">
            <GitBranch className="w-4 h-4 mr-2" />
            Sequences
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-end">
            <Link href="/dashboard/email/campaigns/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </Link>
          </div>

          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No email campaigns yet</p>
                <Link href="/dashboard/email/campaigns/create">
                  <Button>Create your first campaign</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4 text-sm font-medium text-gray-500">Campaign</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-500">List</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-500">Sent</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-500">Opened</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-500">Clicked</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign: any) => (
                      <tr key={campaign.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-gray-500">{campaign.subject}</p>
                        </td>
                        <td className="p-4">
                          <span
                            className={cn(
                              'px-2 py-1 text-xs rounded font-medium',
                              campaignStatusColors[campaign.status] || 'bg-gray-100 text-gray-700'
                            )}
                          >
                            {campaign.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {campaign.list?.name || campaign.listName || '-'}
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Send className="w-3 h-3 text-gray-400" />
                            {campaign.sentCount ?? 0}
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-gray-400" />
                            {campaign.openedCount ?? 0}
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex items-center gap-1">
                            <MousePointerClick className="w-3 h-3 text-gray-400" />
                            {campaign.clickedCount ?? 0}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {campaign.sentAt
                            ? formatDateTime(campaign.sentAt)
                            : campaign.scheduledAt
                            ? formatDateTime(campaign.scheduledAt)
                            : formatDateTime(campaign.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Lists Tab */}
        <TabsContent value="lists" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreateListOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create List
            </Button>
          </div>

          {lists.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No email lists yet</p>
                <Button onClick={() => setCreateListOpen(true)}>Create your first list</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {lists.map((list: any) => (
                <Card key={list.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{list.name}</h3>
                        {list.description && (
                          <p className="text-sm text-gray-500 mt-1">{list.description}</p>
                        )}
                        <p className="text-sm text-gray-400 mt-1">
                          {list.contactCount ?? list._count?.contacts ?? 0} contacts
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/email/lists?listId=${list.id}`}>
                          <Button variant="outline" size="sm">
                            View Contacts
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteList(list.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create List Modal */}
          <Dialog open={createListOpen} onOpenChange={setCreateListOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Email List</DialogTitle>
                <DialogDescription>
                  Create a new list to organize your email contacts.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="list-name">Name</Label>
                  <Input
                    id="list-name"
                    placeholder="e.g. Newsletter Subscribers"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="list-description">Description (optional)</Label>
                  <Textarea
                    id="list-description"
                    placeholder="Describe this list..."
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateListOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateList} disabled={creatingList || !newListName.trim()}>
                  {creatingList ? 'Creating...' : 'Create List'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Sequences Tab */}
        <TabsContent value="sequences" className="space-y-4">
          <div className="flex justify-end">
            <Link href="/dashboard/email/sequences">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Sequence
              </Button>
            </Link>
          </div>

          {sequences.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No email sequences yet</p>
                <Link href="/dashboard/email/sequences">
                  <Button>Create your first sequence</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4 text-sm font-medium text-gray-500">Sequence</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-500">Trigger</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-500">Steps</th>
                      <th className="text-right p-4 text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sequences.map((seq: any) => (
                      <tr key={seq.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <p className="font-medium">{seq.name}</p>
                        </td>
                        <td className="p-4">
                          <span
                            className={cn(
                              'px-2 py-1 text-xs rounded font-medium',
                              sequenceStatusColors[seq.status] || 'bg-gray-100 text-gray-700'
                            )}
                          >
                            {seq.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {seq.triggerType || 'Manual'}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {seq.steps?.length ?? seq.stepCount ?? 0} steps
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            {seq.status === 'ACTIVE' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePauseSequence(seq.id)}
                              >
                                <Pause className="w-3 h-3 mr-1" />
                                Pause
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleActivateSequence(seq.id)}
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Activate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
