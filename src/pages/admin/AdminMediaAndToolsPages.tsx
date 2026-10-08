import React, { useCallback, useEffect, useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import {
  adminDeleteGalleryItem,
  adminExportAllJson,
  adminGetGalleryItems,
  adminImportBackupJson,
  adminSaveSiteTexts,
  adminUpsertGalleryItem,
  adminUpsertSiteImage,
} from '../../lib/adminApi';
import {
  getPublicSiteImages,
  getPublicSiteTexts,
  getSampleContentCounts,
  removeAllSampleContent,
} from '../../lib/content';
import { IMAGE_SLOT_LIST, type ImageSlotConfig } from '../../config/images';
import { useSiteData } from '../../context/SiteDataContext';
import {
  PageHeader,
  Drawer,
  FormField,
  ImageUploader,
  RealContentToggle,
  StatusBadge,
  KebabMenu,
  ReorderButtons,
  ConfirmDialog,
  EmptyState,
  AdminSkeleton,
  ToastContainer,
  type ToastMessage,
} from '../../components/admin/AdminUI';
import type {
  GalleryItem,
  SampleContentCounts,
  SiteImageRow,
  SiteTextsMap,
} from '../../types/database';

// =============================================================================
// 1. PHOTOS & GALLERY PAGE (/admin/photos — Two tabs: "Gallery" & "Website photos")
// =============================================================================

export const AdminPhotosGalleryPage: React.FC = () => {
  const { refreshSiteData } = useSiteData();
  const [activeTab, setActiveTab] = useState<'gallery' | 'slots'>('gallery');

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [siteImages, setSiteImages] = useState<Record<string, SiteImageRow>>({});
  const [loading, setLoading] = useState(true);

  // Gallery item drawer
  const [galleryDrawerOpen, setGalleryDrawerOpen] = useState(false);
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [gImageUrl, setGImageUrl] = useState<string | null>(null);
  const [gBeforeUrl, setGBeforeUrl] = useState<string | null>(null);
  const [gCaption, setGCaption] = useState('');
  const [gCategory, setGCategory] = useState('Hair');
  const [gIsActive, setGIsActive] = useState(true);
  const [gIsReal, setGIsReal] = useState(true);

  // Website slot drawer
  const [slotDrawerConfig, setSlotDrawerConfig] = useState<ImageSlotConfig | null>(null);
  const [slotImageUrl, setSlotImageUrl] = useState<string | null>(null);
  const [slotAlt, setSlotAlt] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [gal, imgs] = await Promise.all([adminGetGalleryItems(), getPublicSiteImages()]);
      setGalleryItems(gal);
      setSiteImages(imgs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateGallery = () => {
    setEditingGalleryId(null);
    setGImageUrl(null);
    setGBeforeUrl(null);
    setGCaption('');
    setGCategory('Hair');
    setGIsActive(true);
    setGIsReal(true);
    setGalleryDrawerOpen(true);
  };

  const openEditGallery = (g: GalleryItem) => {
    setEditingGalleryId(g.id);
    setGImageUrl(g.image_url);
    setGBeforeUrl(g.before_image_url);
    setGCaption(g.caption || '');
    setGCategory(g.category || 'Hair');
    setGIsActive(g.is_active);
    setGIsReal(true);
    setGalleryDrawerOpen(true);
  };

  const handleSaveGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminUpsertGalleryItem({
        id: editingGalleryId || undefined,
        image_url: gImageUrl,
        before_image_url: gBeforeUrl,
        caption: gCaption.trim(),
        category: gCategory,
        is_active: gIsActive,
        is_sample: !gIsReal,
      });
      setGalleryDrawerOpen(false);
      await loadData();
      setToast({
        id: String(Date.now()),
        text: 'Saved. This is now live on your website.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMoveGallery = async (g: GalleryItem, dir: -1 | 1) => {
    const idx = galleryItems.findIndex((x) => x.id === g.id);
    const swap = galleryItems[idx + dir];
    if (!swap) return;
    await Promise.all([
      adminUpsertGalleryItem({ ...g, sort_order: swap.sort_order }),
      adminUpsertGalleryItem({ ...swap, sort_order: g.sort_order }),
    ]);
    await loadData();
  };

  const handleConfirmDeleteGallery = async () => {
    if (!deleteTarget) return;
    const backup = { ...deleteTarget };
    setDeleteTarget(null);
    await adminDeleteGalleryItem(backup.id);
    await loadData();
    setToast({
      id: String(Date.now()),
      text: 'Deleted gallery item.',
      onUndo: () => {
        void adminUpsertGalleryItem(backup).then(() => loadData());
      },
    });
  };

  const openSlotEditor = (slotCfg: ImageSlotConfig) => {
    const row = siteImages[slotCfg.id];
    setSlotDrawerConfig(slotCfg);
    setSlotImageUrl(row?.image_url || null);
    setSlotAlt(row?.alt || slotCfg.defaultAlt);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotDrawerConfig) return;
    setSaving(true);
    try {
      await adminUpsertSiteImage(
        slotDrawerConfig.id,
        slotImageUrl,
        slotAlt.trim() || slotDrawerConfig.defaultAlt
      );
      setSlotDrawerConfig(null);
      await loadData();
      await refreshSiteData();
      setToast({
        id: String(Date.now()),
        text: 'Saved. This is now live on your website.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Photos & gallery"
        description="Upload client result photos to the Gallery or replace any illustration slot across the website."
        helpText="Real photos automatically replace the hand-drawn illustrations as soon as you upload them. Every uploaded image is resized to max 1600px and converted to WebP in your browser."
        primaryActionLabel={activeTab === 'gallery' ? 'Add gallery item' : undefined}
        onPrimaryAction={activeTab === 'gallery' ? openCreateGallery : undefined}
      />

      {/* Two Tabs: "Gallery" & "Website photos" */}
      <div className="flex items-center gap-2 border-b border-[#E6E2DB]">
        <button
          type="button"
          onClick={() => setActiveTab('gallery')}
          className={`px-4 py-2.5 text-[14px] font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'gallery'
              ? 'border-[#C4262E] text-[#C4262E]'
              : 'border-transparent text-[#6B6560] hover:text-[#15110F]'
          }`}
        >
          Gallery ({galleryItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('slots')}
          className={`px-4 py-2.5 text-[14px] font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'slots'
              ? 'border-[#C4262E] text-[#C4262E]'
              : 'border-transparent text-[#6B6560] hover:text-[#15110F]'
          }`}
        >
          Website photos ({IMAGE_SLOT_LIST.length} slots)
        </button>
      </div>

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : activeTab === 'gallery' ? (
        galleryItems.length === 0 ? (
          <EmptyState
            description="Upload your first lookbook or before/after photo to the gallery."
            actionLabel="Add gallery item"
            onAction={openCreateGallery}
          />
        ) : (
          <div className="rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] divide-y divide-[#E6E2DB]">
            {galleryItems.map((g, idx) => (
              <div
                key={g.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-[#F6F4F0]/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ReorderButtons
                    disableUp={idx === 0}
                    disableDown={idx === galleryItems.length - 1}
                    onMoveUp={() => void handleMoveGallery(g, -1)}
                    onMoveDown={() => void handleMoveGallery(g, 1)}
                  />
                  <div className="w-12 h-12 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] overflow-hidden flex items-center justify-center shrink-0">
                    {g.image_url ? (
                      <img
                        src={g.image_url}
                        alt={g.caption || 'Gallery item'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-mono text-[10px] text-[#6B6560]">SVG</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[14px] text-[#15110F] truncate">
                        {g.caption || 'Untitled look'}
                      </span>
                      {g.before_image_url && (
                        <StatusBadge variant="confirmed" label="Before / After" />
                      )}
                      {g.is_sample && <StatusBadge variant="sample" />}
                      <StatusBadge variant={g.is_active ? 'published' : 'hidden'} />
                    </div>
                    <div className="text-[12px] text-[#6B6560]">{g.category}</div>
                  </div>
                </div>

                <KebabMenu
                  actions={[
                    { label: 'Edit item', onClick: () => openEditGallery(g) },
                    {
                      label: g.is_active ? 'Hide from website' : 'Publish on website',
                      onClick: () =>
                        void adminUpsertGalleryItem({
                          ...g,
                          is_active: !g.is_active,
                        }).then(() => loadData()),
                    },
                    {
                      label: 'Delete item',
                      danger: true,
                      onClick: () => setDeleteTarget(g),
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        )
      ) : (
        /* TAB 2: WEBSITE PHOTOS (Every slot from src/config/images.ts) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {IMAGE_SLOT_LIST.map((slotCfg) => {
            const dbRow = siteImages[slotCfg.id];
            const hasPhoto = Boolean(dbRow?.image_url);

            return (
              <div
                key={slotCfg.id}
                className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[12px] font-mono text-[#6B6560]">{slotCfg.id}</span>
                    <StatusBadge
                      variant={hasPhoto ? 'published' : 'sample'}
                      label={hasPhoto ? 'Custom photo' : 'Illustration fallback'}
                    />
                  </div>
                  <h3 className="text-[14px] font-semibold text-[#15110F]">{slotCfg.label}</h3>
                  <p className="text-[12px] text-[#6B6560]">
                    Aspect {slotCfg.aspect} · Mask: {slotCfg.mask}
                  </p>
                  {hasPhoto && dbRow?.image_url && (
                    <div className="mt-3 h-32 rounded-[8px] overflow-hidden border border-[#E6E2DB]">
                      <img
                        src={dbRow.image_url}
                        alt={dbRow.alt || slotCfg.defaultAlt}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => openSlotEditor(slotCfg)}
                  className="w-full py-2 px-3 rounded-[8px] bg-[#F6F4F0] hover:bg-[#E6E2DB]/60 text-[12px] font-medium text-[#15110F] cursor-pointer"
                >
                  {hasPhoto ? 'Replace or remove photo' : 'Upload photo for this slot'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Gallery Item Drawer */}
      <Drawer
        open={galleryDrawerOpen}
        title={editingGalleryId ? 'Edit gallery item' : 'Add gallery item'}
        onClose={() => setGalleryDrawerOpen(false)}
        onSave={(e) => void handleSaveGallery(e)}
        isSaving={saving}
      >
        <FormField label="Category">
          <select
            value={gCategory}
            onChange={(e) => setGCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          >
            <option value="Hair">Hair</option>
            <option value="Hair Colour">Hair Colour</option>
            <option value="Makeup">Makeup</option>
            <option value="Bridal">Bridal</option>
            <option value="Nails">Nails</option>
            <option value="Skin">Skin</option>
          </select>
        </FormField>

        <FormField label="Caption / Look description">
          <input
            type="text"
            placeholder="e.g. Dimensional Balayage & Gloss"
            value={gCaption}
            onChange={(e) => setGCaption(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>

        <ImageUploader
          label="Main / After photo"
          imageUrl={gImageUrl}
          altText={gCaption}
          folder="gallery"
          onChange={(url) => {
            setGImageUrl(url);
            void adminUpsertGalleryItem({
              id: editingGalleryId || undefined,
              image_url: url,
              before_image_url: gBeforeUrl,
              caption: gCaption.trim() || `${gCategory} Lookbook`,
              category: gCategory,
              is_active: gIsActive,
              is_sample: !gIsReal,
            }).then(async (saved) => {
              setEditingGalleryId(saved.id);
              await loadData();
              await refreshSiteData();
              setToast({
                id: String(Date.now()),
                text: url
                  ? 'Photo uploaded and live across all devices.'
                  : 'Photo removed and synced across all devices.',
              });
            });
          }}
        />

        <ImageUploader
          label="Before photo (optional — turns this into a draggable Before/After item)"
          imageUrl={gBeforeUrl === 'ILLUSTRATION_BEFORE' ? null : gBeforeUrl}
          altText={`Before ${gCaption}`}
          folder="gallery-before"
          onChange={(url) => {
            setGBeforeUrl(url);
            if (editingGalleryId || gImageUrl) {
              void adminUpsertGalleryItem({
                id: editingGalleryId || undefined,
                image_url: gImageUrl,
                before_image_url: url,
                caption: gCaption.trim() || `${gCategory} Transformation`,
                category: gCategory,
                is_active: gIsActive,
                is_sample: !gIsReal,
              }).then(async (saved) => {
                setEditingGalleryId(saved.id);
                await loadData();
                await refreshSiteData();
                setToast({
                  id: String(Date.now()),
                  text: 'Before photo synced across all devices.',
                });
              });
            }
          }}
        />

        <label className="flex items-center justify-between p-3 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] cursor-pointer">
          <span className="text-[12px] font-medium">
            {gIsActive ? 'Published on website' : 'Hidden from website'}
          </span>
          <input
            type="checkbox"
            checked={gIsActive}
            onChange={(e) => setGIsActive(e.target.checked)}
            className="w-4 h-4 accent-[#C4262E]"
          />
        </label>

        <RealContentToggle checked={gIsReal} onChange={setGIsReal} />
      </Drawer>

      {/* Website Slot Photo Drawer */}
      <Drawer
        open={Boolean(slotDrawerConfig)}
        title={slotDrawerConfig ? `Slot: ${slotDrawerConfig.label}` : 'Edit slot'}
        onClose={() => setSlotDrawerConfig(null)}
        onSave={(e) => void handleSaveSlot(e)}
        isSaving={saving}
      >
        {slotDrawerConfig && (
          <>
            <p className="text-[12px] text-[#6B6560]">
              Recommended aspect ratio: <strong>{slotDrawerConfig.aspect}</strong>. If you remove
              the photo, the site automatically falls back to the{' '}
              <code className="font-mono">{slotDrawerConfig.illustration}</code> illustration.
            </p>
            <ImageUploader
              label="Slot photo"
              imageUrl={slotImageUrl}
              altText={slotAlt}
              requireAlt
              folder="site-slots"
              onChange={(url, alt) => {
                const urlChanged = url !== slotImageUrl;
                setSlotImageUrl(url);
                setSlotAlt(alt);
                if (urlChanged && slotDrawerConfig) {
                  void adminUpsertSiteImage(
                    slotDrawerConfig.id,
                    url,
                    (alt || slotDrawerConfig.defaultAlt).trim()
                  ).then(async () => {
                    await loadData();
                    await refreshSiteData();
                    setToast({
                      id: String(Date.now()),
                      text: url
                        ? 'Slot photo uploaded and live across all devices.'
                        : 'Slot photo reset and synced across all devices.',
                    });
                  });
                }
              }}
            />
          </>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete gallery item?"
        description="You can undo this deletion for 10 seconds."
        confirmLabel="Delete"
        onConfirm={() => void handleConfirmDeleteGallery()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

// =============================================================================
// 2. HOMEPAGE TEXT PAGE (/admin/homepage-text — Live preview card)
// =============================================================================

export const AdminHomepageTextPage: React.FC = () => {
  const { refreshSiteData } = useSiteData();
  const [texts, setTexts] = useState<SiteTextsMap | null>(null);
  const [marqueeInput, setMarqueeInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    getPublicSiteTexts().then((t) => {
      setTexts(t);
      setMarqueeInput(t.marquee.phrases.join('\n'));
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texts) return;
    setSaving(true);
    try {
      const updated: SiteTextsMap = {
        ...texts,
        marquee: {
          phrases: marqueeInput
            .split('\n')
            .map((p) => p.trim())
            .filter(Boolean),
        },
      };
      await adminSaveSiteTexts(updated);
      setTexts(updated);
      await refreshSiteData();
      setToast({
        id: String(Date.now()),
        text: 'Saved. This is now live on your website.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!texts) return <AdminSkeleton rows={4} />;

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Homepage text"
        description="Edit the homepage hero headline, announcement bar, scrolling marquee phrases, and footer line."
        helpText="Changes appear immediately in the live preview on the right and go live on the public homepage when you click Save changes."
        primaryActionLabel={saving ? 'Saving...' : 'Save changes'}
        onPrimaryAction={() => {
          const form = document.getElementById('homepage-text-form') as HTMLFormElement | null;
          form?.requestSubmit();
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          id="homepage-text-form"
          onSubmit={handleSave}
          className="lg:col-span-7 p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] space-y-4"
        >
          <h2 className="text-[16px] font-semibold text-[#15110F]">Hero section</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Headline line 1" required>
              <input
                type="text"
                required
                value={texts.hero.line1}
                onChange={(e) =>
                  setTexts({ ...texts, hero: { ...texts.hero, line1: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
              />
            </FormField>
            <FormField label="Headline line 2 (outlined)" required>
              <input
                type="text"
                required
                value={texts.hero.line2}
                onChange={(e) =>
                  setTexts({
                    ...texts,
                    hero: { ...texts.hero, line2: e.target.value, accent: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
              />
            </FormField>
          </div>

          <FormField label="Hero subheadline" required>
            <textarea
              rows={2}
              required
              value={texts.hero.subheadline}
              onChange={(e) =>
                setTexts({ ...texts, hero: { ...texts.hero, subheadline: e.target.value } })
              }
              className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Primary button label">
              <input
                type="text"
                value={texts.hero.primary_cta}
                onChange={(e) =>
                  setTexts({ ...texts, hero: { ...texts.hero, primary_cta: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
              />
            </FormField>
            <FormField label="Secondary button label">
              <input
                type="text"
                value={texts.hero.secondary_cta}
                onChange={(e) =>
                  setTexts({ ...texts, hero: { ...texts.hero, secondary_cta: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
              />
            </FormField>
          </div>

          <div className="pt-4 border-t border-[#E6E2DB] space-y-3">
            <h2 className="text-[16px] font-semibold text-[#15110F]">Announcement &amp; Marquee</h2>
            <label className="flex items-center justify-between p-3 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] cursor-pointer">
              <span className="text-[12px] font-medium">Show announcement bar</span>
              <input
                type="checkbox"
                checked={texts.announcement.enabled}
                onChange={(e) =>
                  setTexts({
                    ...texts,
                    announcement: { ...texts.announcement, enabled: e.target.checked },
                  })
                }
                className="w-4 h-4 accent-[#C4262E]"
              />
            </label>

            <FormField label="Announcement bar text">
              <input
                type="text"
                value={texts.announcement.text}
                onChange={(e) =>
                  setTexts({
                    ...texts,
                    announcement: { ...texts.announcement, text: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
              />
            </FormField>

            <FormField label="Marquee phrases (one phrase per line)">
              <textarea
                rows={5}
                value={marqueeInput}
                onChange={(e) => setMarqueeInput(e.target.value)}
                className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] font-mono text-[13px]"
              />
            </FormField>

            <FormField label="Footer closing line">
              <input
                type="text"
                value={texts.footer.final_line}
                onChange={(e) =>
                  setTexts({ ...texts, footer: { final_line: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
              />
            </FormField>
          </div>
        </form>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 p-6 rounded-[12px] bg-[#F5F0E8] border border-[#E6E2DB] space-y-4">
          <div className="text-[12px] font-mono uppercase tracking-wider text-[#6B6560]">
            Live Preview
          </div>
          {texts.announcement.enabled && (
            <div className="px-3 py-1.5 rounded bg-[#15110F] text-[#F5F0E8] text-xs font-mono">
              {texts.announcement.text}
            </div>
          )}
          <div className="font-display text-4xl font-extrabold leading-none text-[#15110F]">
            {texts.hero.line1}{' '}
            <span className="text-outline-ink">{texts.hero.line2}</span>
          </div>
          <p className="text-sm text-[#15110F]/80">{texts.hero.subheadline}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="px-4 py-2 rounded-full bg-[#C4262E] text-white text-xs font-medium">
              {texts.hero.primary_cta}
            </span>
            <span className="px-4 py-2 rounded-full border border-[#15110F]/30 text-xs font-medium">
              {texts.hero.secondary_cta}
            </span>
          </div>
          <div className="pt-4 border-t border-[#15110F]/10 text-xs font-mono text-[#15110F]/70">
            Footer: {texts.footer.final_line}
          </div>
        </div>
      </div>

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

// =============================================================================
// 3. DATA TOOLS PAGE (/admin/data-tools — Export JSON, Import JSON, Remove sample)
// =============================================================================

export const AdminDataToolsPage: React.FC = () => {
  const { refreshSiteData } = useSiteData();
  const [sampleCounts, setSampleCounts] = useState<SampleContentCounts | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadCounts = useCallback(async () => {
    setSampleCounts(await getSampleContentCounts());
  }, []);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  const handleExportJson = async () => {
    const dump = await adminExportAllJson();
    const blob = new Blob([JSON.stringify(dump, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bbold-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      await adminImportBackupJson(parsed);
      await refreshSiteData();
      await loadCounts();
      setToast({
        id: String(Date.now()),
        text: 'Backup imported and live on your website.',
      });
    } catch {
      setToast({
        id: String(Date.now()),
        text: 'Invalid backup JSON file.',
      });
    }
  };

  const handleRemoveSample = async () => {
    setConfirmRemove(false);
    const res = await removeAllSampleContent();
    await refreshSiteData();
    await loadCounts();
    setToast({
      id: String(Date.now()),
      text: `Removed sample content (${res.deactivatedServicesCount} referenced services hidden).`,
    });
  };

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Data tools"
        description="Export a complete JSON backup of your website content, restore a backup, or remove sample rows."
        helpText="Always export a JSON backup before making bulk changes or removing all sample rows."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#15110F]">Export content backup</h2>
            <p className="text-[14px] text-[#6B6560] mt-1">
              Download all services, stylists, courses, testimonials, FAQs, hours, and settings as
              a JSON file.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleExportJson()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[8px] bg-[#15110F] text-white text-[14px] font-medium cursor-pointer"
          >
            <Download size={16} />
            <span>Export JSON</span>
          </button>
        </div>

        <div className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#15110F]">Import content backup</h2>
            <p className="text-[14px] text-[#6B6560] mt-1">
              Restore services, stylists, courses, and settings from a previously exported JSON
              file.
            </p>
          </div>
          <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[8px] border border-[#E6E2DB] bg-[#F6F4F0] hover:bg-[#E6E2DB]/60 text-[14px] font-medium cursor-pointer">
            <Upload size={16} />
            <span>Choose JSON file</span>
            <input
              type="file"
              accept="application/json"
              onChange={(e) => void handleImportJson(e.target.files?.[0])}
              className="hidden"
            />
          </label>
        </div>

        <div className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#15110F]">Remove sample content</h2>
            <p className="text-[14px] text-[#6B6560] mt-1">
              Currently <strong>{sampleCounts?.total ?? 0}</strong> sample rows remain in the
              database. Delete them before going live.
            </p>
          </div>
          <button
            type="button"
            disabled={!sampleCounts || sampleCounts.total === 0}
            onClick={() => setConfirmRemove(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[8px] bg-[#B3261E] text-white text-[14px] font-medium disabled:opacity-40 cursor-pointer"
          >
            <Trash2 size={16} />
            <span>Remove all sample content</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove all sample content?"
        description="This deletes all rows still marked as sample content across every table. Sample services linked to appointments will be hidden instead."
        confirmLabel="Remove sample content"
        onConfirm={() => void handleRemoveSample()}
        onCancel={() => setConfirmRemove(false)}
      />

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};
