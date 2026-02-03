'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Settings,
  Undo,
  Redo,
  Smartphone,
  Tablet,
  Monitor,
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pagesApi, workspaceApi } from '@/lib/api';
import { toast } from 'sonner';

interface PageBlock {
  id: string;
  type: string;
  props: Record<string, any>;
  html?: string;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content: PageBlock[];
  htmlContent?: string;
  status: 'DRAFT' | 'PUBLISHED';
  isHomePage: boolean;
  seoTitle?: string;
  seoKeywords?: string;
}

const BLOCK_TYPES = [
  { type: 'hero', label: 'Hero Section', icon: '🎯' },
  { type: 'features', label: 'Features', icon: '✨' },
  { type: 'testimonials', label: 'Testimonials', icon: '💬' },
  { type: 'pricing', label: 'Pricing', icon: '💰' },
  { type: 'cta', label: 'Call to Action', icon: '📢' },
  { type: 'text', label: 'Text Section', icon: '📝' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'gallery', label: 'Gallery', icon: '🎨' },
  { type: 'faq', label: 'FAQ', icon: '❓' },
  { type: 'contact', label: 'Contact Form', icon: '📧' },
  { type: 'team', label: 'Team', icon: '👥' },
  { type: 'stats', label: 'Statistics', icon: '📊' },
];

export default function PageEditorPage() {
  const router = useRouter();
  const params = useParams();
  const pageId = params.id as string;

  const [page, setPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showSettings, setShowSettings] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);

  // AI Section generation
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiSectionType, setAiSectionType] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingSection, setGeneratingSection] = useState(false);

  // History for undo/redo
  const [history, setHistory] = useState<PageBlock[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    fetchPage();
    fetchWorkspace();
  }, [pageId]);

  const fetchPage = async () => {
    try {
      const response = await pagesApi.get(pageId);
      const pageData = response.data.page;
      setPage(pageData);
      setBlocks(pageData.content || []);
      setHistory([pageData.content || []]);
      setHistoryIndex(0);
    } catch (error) {
      toast.error('Failed to load page');
      router.push('/dashboard/workspace/pages');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspace = async () => {
    try {
      const response = await workspaceApi.get();
      setWorkspaceSlug(response.data.workspace?.slug);
    } catch {
      // Ignore
    }
  };

  const saveBlocks = useCallback((newBlocks: PageBlock[]) => {
    setBlocks(newBlocks);
    setIsDirty(true);

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newBlocks);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleSave = async () => {
    if (!page) return;

    setSaving(true);
    try {
      const htmlContent = blocks.map(b => b.html || '').join('\n');
      await pagesApi.updateContent(pageId, {
        blocks,
        htmlContent,
      });
      setIsDirty(false);
      toast.success('Page saved successfully');
    } catch (error) {
      toast.error('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setBlocks(history[historyIndex - 1]);
      setIsDirty(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setBlocks(history[historyIndex + 1]);
      setIsDirty(true);
    }
  };

  const handlePublish = async () => {
    try {
      await pagesApi.publish(pageId);
      setPage(page ? { ...page, status: 'PUBLISHED' } : null);
      toast.success('Page published!');
    } catch {
      toast.error('Failed to publish page');
    }
  };

  const handleUnpublish = async () => {
    try {
      await pagesApi.unpublish(pageId);
      setPage(page ? { ...page, status: 'DRAFT' } : null);
      toast.success('Page unpublished');
    } catch {
      toast.error('Failed to unpublish page');
    }
  };

  const addBlock = (type: string) => {
    const newBlock: PageBlock = {
      id: `block-${Date.now()}`,
      type,
      props: {},
      html: `<section class="py-16 px-4 bg-gray-50"><div class="max-w-4xl mx-auto text-center"><h2 class="text-2xl font-bold">${type.charAt(0).toUpperCase() + type.slice(1)} Section</h2><p class="text-gray-600 mt-2">Click to edit this ${type} section</p></div></section>`,
    };
    saveBlocks([...blocks, newBlock]);
  };

  const removeBlock = (blockId: string) => {
    saveBlocks(blocks.filter(b => b.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    saveBlocks(newBlocks);
  };

  const generateAiSection = async () => {
    if (!aiSectionType || !aiPrompt) {
      toast.error('Please select a section type and provide a description');
      return;
    }

    setGeneratingSection(true);
    try {
      const response = await pagesApi.generateSection({
        sectionType: aiSectionType,
        prompt: aiPrompt,
      });

      const newBlock = response.data.block;
      saveBlocks([...blocks, newBlock]);
      setShowAiDialog(false);
      setAiSectionType('');
      setAiPrompt('');
      toast.success('Section generated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate section');
    } finally {
      setGeneratingSection(false);
    }
  };

  const updateBlockHtml = (blockId: string, newHtml: string) => {
    const newBlocks = blocks.map(b =>
      b.id === blockId ? { ...b, html: newHtml } : b
    );
    saveBlocks(newBlocks);
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!page) {
    return null;
  }

  const previewWidth = {
    desktop: 'w-full',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]',
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/workspace/pages')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-gray-200" />
          <div>
            <h1 className="font-semibold text-sm">{page.title}</h1>
            <p className="text-xs text-gray-500">/{page.slug}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
          >
            <Redo className="w-4 h-4" />
          </Button>

          <div className="h-6 w-px bg-gray-200" />

          {/* Preview Size */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode('desktop')}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant={previewMode === 'tablet' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode('tablet')}
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button
              variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode('mobile')}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          {/* Settings */}
          <Sheet open={showSettings} onOpenChange={setShowSettings}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Page Settings</SheetTitle>
                <SheetDescription>
                  Configure page metadata and SEO settings
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={page.title} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={page.slug} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>SEO Title</Label>
                  <Input
                    value={page.seoTitle || ''}
                    placeholder="SEO optimized title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SEO Keywords</Label>
                  <Input
                    value={page.seoKeywords || ''}
                    placeholder="keyword1, keyword2"
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Preview */}
          {workspaceSlug && page.status === 'PUBLISHED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(
                  `https://${workspaceSlug}.jeeper.app/${page.slug}`,
                  '_blank'
                )
              }
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          )}

          {/* Publish/Unpublish */}
          {page.status === 'PUBLISHED' ? (
            <Button variant="outline" size="sm" onClick={handleUnpublish}>
              <EyeOff className="w-4 h-4 mr-2" />
              Unpublish
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handlePublish}>
              <Eye className="w-4 h-4 mr-2" />
              Publish
            </Button>
          )}

          {/* Save */}
          <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Saving...' : isDirty ? 'Save*' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Blocks */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-sm text-gray-700 mb-3">Add Blocks</h3>
            <div className="space-y-2">
              {BLOCK_TYPES.map((block) => (
                <button
                  key={block.type}
                  onClick={() => addBlock(block.type)}
                  className="w-full flex items-center px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="mr-2">{block.icon}</span>
                  {block.label}
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAiDialog(true)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate with AI
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-6">
          <div
            className={`mx-auto bg-white shadow-lg min-h-full transition-all ${previewWidth[previewMode]}`}
          >
            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No blocks yet</h3>
                <p className="text-gray-500 mb-4">
                  Add blocks from the sidebar or generate with AI
                </p>
                <Button onClick={() => setShowAiDialog(true)}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                </Button>
              </div>
            ) : (
              <div>
                {blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className={`relative group ${
                      selectedBlockId === block.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedBlockId(block.id)}
                  >
                    {/* Block Controls */}
                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-white rounded-lg shadow-lg p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlock(block.id, 'up');
                        }}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlock(block.id, 'down');
                        }}
                        disabled={index === blocks.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-4 bg-gray-200" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBlock(block.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Block Content */}
                    {block.html ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: block.html }}
                        className="cursor-pointer"
                      />
                    ) : (
                      <div className="py-12 px-4 text-center bg-gray-50">
                        <p className="text-gray-500">{block.type} block</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-72 bg-white border-l overflow-y-auto">
          <div className="p-4">
            {selectedBlock ? (
              <>
                <h3 className="font-semibold text-sm text-gray-700 mb-4">
                  {BLOCK_TYPES.find(b => b.type === selectedBlock.type)?.label || 'Block'} Properties
                </h3>
                <Tabs defaultValue="content">
                  <TabsList className="w-full">
                    <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
                    <TabsTrigger value="style" className="flex-1">Style</TabsTrigger>
                  </TabsList>
                  <TabsContent value="content" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>HTML Content</Label>
                      <Textarea
                        value={selectedBlock.html || ''}
                        onChange={(e) => updateBlockHtml(selectedBlock.id, e.target.value)}
                        rows={10}
                        className="font-mono text-xs"
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="style" className="space-y-4 mt-4">
                    <p className="text-sm text-gray-500">
                      Style properties coming soon. Edit HTML directly for now.
                    </p>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">
                  Select a block to edit its properties
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Section Generation Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-primary" />
              Generate Section with AI
            </DialogTitle>
            <DialogDescription>
              Describe the section you want and AI will create it for you
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Section Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {BLOCK_TYPES.slice(0, 9).map((block) => (
                  <button
                    key={block.type}
                    onClick={() => setAiSectionType(block.type)}
                    className={`p-2 text-sm text-center rounded-lg border transition-colors ${
                      aiSectionType === block.type
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-lg mb-1">{block.icon}</span>
                    {block.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Describe Your Section</Label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="E.g., A hero section with a gradient background, bold headline about productivity, and two CTA buttons"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAiDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={generateAiSection}
              disabled={generatingSection || !aiSectionType || !aiPrompt}
            >
              {generatingSection ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
