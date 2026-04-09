'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Users,
  ChevronDown,
  ChevronRight,
  UserPlus,
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

const contactStatusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  UNSUBSCRIBED: 'bg-gray-100 text-gray-700',
  BOUNCED: 'bg-red-100 text-red-700',
};

export default function EmailListsPage() {
  const searchParams = useSearchParams();
  const initialListId = searchParams.get('listId');

  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedListId, setExpandedListId] = useState<string | null>(initialListId);
  const [contacts, setContacts] = useState<Record<string, any[]>>({});
  const [loadingContacts, setLoadingContacts] = useState<Record<string, boolean>>({});

  // Modals
  const [createListOpen, setCreateListOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importListId, setImportListId] = useState('');
  const [importCsv, setImportCsv] = useState('');
  const [importing, setImporting] = useState(false);

  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addContactListId, setAddContactListId] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [addingContact, setAddingContact] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  useEffect(() => {
    if (initialListId) {
      fetchContacts(initialListId);
    }
  }, [initialListId]);

  const fetchLists = async () => {
    setLoading(true);
    try {
      const res = await emailApi.getLists();
      setLists(res.data?.lists || res.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load lists');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async (listId: string) => {
    setLoadingContacts((prev) => ({ ...prev, [listId]: true }));
    try {
      const res = await emailApi.getContacts(listId);
      setContacts((prev) => ({
        ...prev,
        [listId]: res.data?.contacts || res.data || [],
      }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load contacts');
    } finally {
      setLoadingContacts((prev) => ({ ...prev, [listId]: false }));
    }
  };

  const toggleList = (listId: string) => {
    if (expandedListId === listId) {
      setExpandedListId(null);
    } else {
      setExpandedListId(listId);
      if (!contacts[listId]) {
        fetchContacts(listId);
      }
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setCreatingList(true);
    try {
      await emailApi.createList({ name: newListName, description: newListDescription });
      toast.success('List created');
      setCreateListOpen(false);
      setNewListName('');
      setNewListDescription('');
      fetchLists();
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
      if (expandedListId === id) setExpandedListId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete list');
    }
  };

  const handleAddContact = async () => {
    if (!newContactEmail.trim()) return;
    setAddingContact(true);
    try {
      await emailApi.addContact({
        listId: addContactListId,
        email: newContactEmail,
        name: newContactName || undefined,
      });
      toast.success('Contact added');
      setAddContactOpen(false);
      setNewContactEmail('');
      setNewContactName('');
      fetchContacts(addContactListId);
      fetchLists();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add contact');
    } finally {
      setAddingContact(false);
    }
  };

  const handleImportContacts = async () => {
    if (!importCsv.trim() || !importListId) return;
    setImporting(true);
    try {
      const lines = importCsv.trim().split('\n');
      const contactsToImport = lines.map((line) => {
        const [email, name] = line.split(',').map((s) => s.trim());
        return { email, name: name || undefined };
      });
      await emailApi.importContacts({ listId: importListId, contacts: contactsToImport });
      toast.success(`${contactsToImport.length} contacts imported`);
      setImportOpen(false);
      setImportCsv('');
      fetchContacts(importListId);
      fetchLists();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to import contacts');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteContact = async (contactId: string, listId: string) => {
    try {
      await emailApi.deleteContact(contactId);
      toast.success('Contact removed');
      setContacts((prev) => ({
        ...prev,
        [listId]: (prev[listId] || []).filter((c) => c.id !== contactId),
      }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete contact');
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
          <h1 className="text-3xl font-bold">Email Lists & Contacts</h1>
          <p className="text-gray-500 mt-1">Manage your subscriber lists and contacts</p>
        </div>
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
        <div className="space-y-4">
          {lists.map((list) => (
            <Card key={list.id}>
              <CardContent className="p-0">
                {/* List Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleList(list.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedListId === list.id ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <div>
                      <h3 className="font-medium">{list.name}</h3>
                      {list.description && (
                        <p className="text-sm text-gray-500">{list.description}</p>
                      )}
                      <p className="text-sm text-gray-400">
                        {list.contactCount ?? list._count?.contacts ?? 0} contacts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAddContactListId(list.id);
                        setAddContactOpen(true);
                      }}
                    >
                      <UserPlus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImportListId(list.id);
                        setImportOpen(true);
                      }}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Import
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteList(list.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {/* Contacts */}
                {expandedListId === list.id && (
                  <div className="border-t">
                    {loadingContacts[list.id] ? (
                      <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      </div>
                    ) : (contacts[list.id] || []).length === 0 ? (
                      <div className="p-6 text-center text-gray-500 text-sm">
                        No contacts in this list yet
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="text-left p-3 text-xs font-medium text-gray-500">Email</th>
                            <th className="text-left p-3 text-xs font-medium text-gray-500">Name</th>
                            <th className="text-left p-3 text-xs font-medium text-gray-500">Status</th>
                            <th className="text-right p-3 text-xs font-medium text-gray-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(contacts[list.id] || []).map((contact: any) => (
                            <tr key={contact.id} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="p-3 text-sm">{contact.email}</td>
                              <td className="p-3 text-sm text-gray-600">{contact.name || '-'}</td>
                              <td className="p-3">
                                <span
                                  className={cn(
                                    'px-2 py-0.5 text-xs rounded font-medium',
                                    contactStatusColors[contact.status] || 'bg-gray-100 text-gray-700'
                                  )}
                                >
                                  {contact.status || 'ACTIVE'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteContact(contact.id, list.id)}
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
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
            <DialogDescription>Create a new list to organize your email contacts.</DialogDescription>
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
              <Label htmlFor="list-desc">Description (optional)</Label>
              <Textarea
                id="list-desc"
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

      {/* Add Contact Modal */}
      <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Add a new contact to this list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="contact@example.com"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="contact-name">Name (optional)</Label>
              <Input
                id="contact-name"
                placeholder="John Doe"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddContactOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddContact} disabled={addingContact || !newContactEmail.trim()}>
              {addingContact ? 'Adding...' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Contacts Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Contacts</DialogTitle>
            <DialogDescription>
              Paste CSV data with one contact per line: email,name
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="csv-data">CSV Data</Label>
            <Textarea
              id="csv-data"
              placeholder={"john@example.com,John Doe\njane@example.com,Jane Smith"}
              className="font-mono text-sm min-h-[150px]"
              value={importCsv}
              onChange={(e) => setImportCsv(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Format: email,name (one per line)</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportContacts} disabled={importing || !importCsv.trim()}>
              {importing ? 'Importing...' : 'Import Contacts'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
