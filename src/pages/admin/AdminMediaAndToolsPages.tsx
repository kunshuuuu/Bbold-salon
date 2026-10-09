import React, { useCallback, useEffect, useState } from 'react';
import {
  Download,
  Upload,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  Database,
  ShieldCheck,
  Code2,
  Plus,
  Edit3,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  adminDeleteGalleryItem,
  adminExportAllJson,
  adminGetGalleryItems,
  adminImportBackupJson,
  adminSaveSiteTexts,
  adminSaveStationsSection,
  adminSaveTransformationsSection,
  adminUpsertGalleryItem,
  adminUpsertSiteImage,
} from '../../lib/adminApi';
import {
  ADMIN_ALLOWED_EMAIL,
  ADMIN_ALLOWED_UID,
  checkSupabaseConnectionProgress,
  generateCompleteSupabaseSql,
  type SupabaseConnectionReport,
} from '../../lib/supabaseSetup';
import {
  getPublicSiteImages,
  getPublicSiteTexts,
  getSampleContentCounts,
  removeAllSampleContent,
} from '../../lib/content';
import {
  DEFAULT_HOMEPAGE_STATIONS_SECTION,
  DEFAULT_HOMEPAGE_TRANSFORMATIONS_SECTION,
} from '../../config/site';
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
  HomepageStationCard,
  HomepageStationsSection,
  HomepageTransformationCard,
  HomepageTransformationsSection,
  RoomId,
  SampleContentCounts,
  SiteImageRow,
  SiteTextsMap,
  StationCardDetailItem,
} from '../../types/database';

// =============================================================================
// 1A. HOMEPAGE SECTION 02 MANAGER: "02 / Six Stations Under One Roof"
//     Full CRUD (Add, Edit, Remove, Reorder Cards + Upload Photo + Edit Details & Description)
// =============================================================================

export const AdminHomepageStationsPage: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
  const { refreshSiteData } = useSiteData();
  const [section, setSection] = useState<HomepageStationsSection>(
    DEFAULT_HOMEPAGE_STATIONS_SECTION
  );
  const [siteImages, setSiteImages] = useState<Record<string, SiteImageRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Card Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cNum, setCNum] = useState('01');
  const [cTitle, setCTitle] = useState('');
  const [cDescription, setCDescription] = useState('');
  const [cCategoryKey, setCCategoryKey] = useState('Hair');
  const [cRoom, setCRoom] = useState<RoomId>('hair');
  const [cSlot, setCSlot] = useState('station_1');
  const [cImageUrl, setCImageUrl] = useState<string | null>(null);
  const [cImageAlt, setCImageAlt] = useState('');
  const [cDetails, setCDetails] = useState<StationCardDetailItem[]>([]);
  const [cLinkTo, setCLinkTo] = useState('/services');
  const [cLinkLabel, setCLinkLabel] = useState('Explore Menu →');
  const [cIsActive, setCIsActive] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<HomepageStationCard | null>(null);

  const loadStationsData = useCallback(async () => {
    setLoading(true);
    try {
      const [texts, imgs] = await Promise.all([getPublicSiteTexts(), getPublicSiteImages()]);
      setSiteImages(imgs);
      const loadedStations = texts.stations || DEFAULT_HOMEPAGE_STATIONS_SECTION;
      const cards = (
        Array.isArray(loadedStations.cards)
          ? loadedStations.cards
          : DEFAULT_HOMEPAGE_STATIONS_SECTION.cards
      )
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((c) => {
          const catLower = (c.categoryKey || c.title || '').toLowerCase();
          const legacySlot = catLower.includes('men')
            ? 'cat_men'
            : catLower.includes('nail')
            ? 'cat_nails'
            : catLower.includes('makeup') || catLower.includes('bridal')
            ? 'cat_makeup'
            : catLower.includes('skin')
            ? 'cat_skin'
            : catLower.includes('academy')
            ? 'academy_hero'
            : 'cat_hair';
          const resolvedImg =
            c.image_url ||
            (c.slot ? imgs[c.slot]?.image_url : null) ||
            imgs[legacySlot]?.image_url ||
            null;
          return {
            ...c,
            image_url: resolvedImg,
          };
        });
      setSection({
        eyebrow: loadedStations.eyebrow || DEFAULT_HOMEPAGE_STATIONS_SECTION.eyebrow,
        heading: loadedStations.heading || DEFAULT_HOMEPAGE_STATIONS_SECTION.heading,
        cards,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStationsData();
  }, [loadStationsData]);

  const persistSection = async (
    nextSection: HomepageStationsSection,
    message = 'Saved to website and Supabase database.'
  ) => {
    setSaving(true);
    try {
      const normalizedCards = nextSection.cards.map((c, idx) => ({
        ...c,
        sort_order: idx + 1,
      }));
      const payload: HomepageStationsSection = {
        ...nextSection,
        cards: normalizedCards,
      };
      await adminSaveStationsSection(payload);
      setSection(payload);
      await refreshSiteData();
      const imgs = await getPublicSiteImages();
      setSiteImages(imgs);
      setToast({ id: String(Date.now()), text: message });
    } finally {
      setSaving(false);
    }
  };

  const openAddCard = () => {
    const nextNum = String(section.cards.length + 1).padStart(2, '0');
    setEditingCardId(null);
    setCNum(nextNum);
    setCTitle('');
    setCDescription('');
    setCCategoryKey('Hair');
    setCRoom('hair');
    setCSlot(`station_${section.cards.length + 1}`);
    setCImageUrl(null);
    setCImageAlt('');
    setCDetails([
      { label: 'Signature Service 01', value: 'from ₹900' },
      { label: 'Signature Service 02', value: 'from ₹1,500' },
      { label: 'Signature Service 03', value: 'from ₹2,500' },
    ]);
    setCLinkTo('/services');
    setCLinkLabel('Explore Station →');
    setCIsActive(true);
    setDrawerOpen(true);
  };

  const openEditCard = (card: HomepageStationCard) => {
    setEditingCardId(card.id);
    setCNum(card.num || '01');
    setCTitle(card.title || '');
    setCDescription(card.description || '');
    setCCategoryKey(card.categoryKey || 'Hair');
    setCRoom(card.room || 'hair');
    setCSlot(card.slot || 'station_1');
    setCImageUrl(card.image_url || (card.slot ? siteImages[card.slot]?.image_url || null : null));
    setCImageAlt(card.image_alt || `${card.title} at Bbold Salon & Academy`);
    setCDetails(
      Array.isArray(card.details) && card.details.length > 0
        ? card.details.map((d) => ({ ...d }))
        : [
            { label: 'Service / Course 01', value: 'from ₹900' },
            { label: 'Service / Course 02', value: 'from ₹1,500' },
          ]
    );
    setCLinkTo(card.linkTo || '/services');
    setCLinkLabel(card.linkLabel || 'Explore Menu →');
    setCIsActive(card.is_active !== false);
    setDrawerOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedDetails = cDetails
      .map((d) => ({ label: d.label.trim(), value: d.value.trim() }))
      .filter((d) => d.label.length > 0);

    const cardObj: HomepageStationCard = {
      id: editingCardId || `station-card-${Date.now()}`,
      num: cNum.trim() || '01',
      title: cTitle.trim() || 'New Station',
      description: cDescription.trim(),
      categoryKey: cCategoryKey.trim() || 'Hair',
      room: cRoom,
      slot: cSlot || `station_${section.cards.length + 1}`,
      image_url: cImageUrl,
      image_alt: cImageAlt.trim() || `${cTitle.trim()} at Bbold Salon & Academy`,
      details: cleanedDetails,
      linkTo: cLinkTo.trim() || '/services',
      linkLabel: cLinkLabel.trim() || 'Explore Menu →',
      is_active: cIsActive,
      sort_order: editingCardId
        ? section.cards.find((x) => x.id === editingCardId)?.sort_order ?? section.cards.length + 1
        : section.cards.length + 1,
    };

    const nextCards = editingCardId
      ? section.cards.map((c) => (c.id === editingCardId ? cardObj : c))
      : [...section.cards, cardObj];

    setDrawerOpen(false);
    await persistSection(
      { ...section, cards: nextCards },
      editingCardId
        ? `Updated "${cardObj.title}" and synced to Supabase.`
        : `Added "${cardObj.title}" and synced to Supabase.`
    );
  };

  const handleMoveCard = async (card: HomepageStationCard, dir: -1 | 1) => {
    const idx = section.cards.findIndex((c) => c.id === card.id);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= section.cards.length) return;
    const copy = [...section.cards];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    await persistSection({ ...section, cards: copy }, 'Station order updated in Supabase.');
  };

  const handleDeleteCard = async () => {
    if (!deleteTarget) return;
    const removed = deleteTarget;
    const prevCards = [...section.cards];
    setDeleteTarget(null);
    const nextCards = section.cards.filter((c) => c.id !== removed.id);
    await persistSection(
      { ...section, cards: nextCards },
      `Removed "${removed.title}" from homepage.`
    );
    setToast({
      id: String(Date.now()),
      text: `Removed "${removed.title}".`,
      onUndo: () => {
        void persistSection({ ...section, cards: prevCards }, 'Restored station card.');
      },
    });
  };

  return (
    <div className="space-y-6 min-w-0">
      {!embedded ? (
        <PageHeader
          title="02 / Six Stations Under One Roof"
          description="Upload pictures, edit descriptions and service/course details, or add and remove station cards on the homepage."
          helpText="Every change to Station 01–06 (including Nail Studio, Makeup & Bridal, and Bbold Academy) is saved directly to Supabase and live across all devices."
          primaryActionLabel="Add station card"
          onPrimaryAction={openAddCard}
        />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB]">
          <div>
            <h2 className="text-[16px] font-semibold text-[#15110F]">
              Homepage Section 02 — Six Stations Under One Roof
            </h2>
            <p className="text-[13px] text-[#6B6560]">
              Upload pictures, edit descriptions &amp; details, or add and remove station cards
              (including Station 03 Nail Studio, Station 04 Makeup &amp; Bridal, Station 06 Bbold Academy).
            </p>
          </div>
          <button
            type="button"
            onClick={openAddCard}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#C4262E] text-white text-[13px] font-medium hover:opacity-95 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Add station card</span>
          </button>
        </div>
      )}

      {/* Section Eyebrow & Heading Editor */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void persistSection(section, 'Section heading saved to Supabase.');
        }}
        className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
      >
        <div className="md:col-span-4">
          <FormField label="Section Eyebrow Label">
            <input
              type="text"
              value={section.eyebrow}
              onChange={(e) => setSection({ ...section, eyebrow: e.target.value })}
              className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[13px] font-mono"
            />
          </FormField>
        </div>
        <div className="md:col-span-5">
          <FormField label="Section Main Heading">
            <input
              type="text"
              value={section.heading}
              onChange={(e) => setSection({ ...section, heading: e.target.value })}
              className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
            />
          </FormField>
        </div>
        <div className="md:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 px-4 rounded-[8px] bg-[#15110F] hover:bg-[#C4262E] text-white text-[13px] font-medium transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save section header'}
          </button>
        </div>
      </form>

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : section.cards.length === 0 ? (
        <EmptyState
          description="No station cards yet. Add a station card to display in Section 02 on the homepage."
          actionLabel="Add station card"
          onAction={openAddCard}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {section.cards.map((card, idx) => {
            const hasPhoto = Boolean(card.image_url);
            return (
              <div
                key={card.id}
                className="p-5 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] flex flex-col justify-between gap-4 shadow-xs"
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail Preview */}
                  <div
                    onClick={() => openEditCard(card)}
                    className="w-24 h-30 rounded-[10px] bg-[#F6F4F0] border border-[#E6E2DB] overflow-hidden shrink-0 flex flex-col items-center justify-center cursor-pointer group relative"
                  >
                    {hasPhoto && card.image_url ? (
                      <img
                        src={card.image_url}
                        alt={card.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="p-2 text-center">
                        <span className="font-mono text-[10px] text-[#6B6560] block">No Photo</span>
                        <span className="text-[10px] text-[#C4262E] font-medium underline mt-1 block">
                          Upload
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-[#E8A317]/30 border border-[#15110F]/20 font-mono text-[11px] font-bold text-[#15110F]">
                          Station {card.num}
                        </span>
                        <StatusBadge
                          variant={hasPhoto ? 'published' : 'sample'}
                          label={hasPhoto ? 'Custom photo' : 'Illustration'}
                        />
                        <StatusBadge variant={card.is_active !== false ? 'published' : 'hidden'} />
                      </div>
                      <ReorderButtons
                        disableUp={idx === 0}
                        disableDown={idx === section.cards.length - 1}
                        onMoveUp={() => void handleMoveCard(card, -1)}
                        onMoveDown={() => void handleMoveCard(card, 1)}
                      />
                    </div>

                    <h3 className="text-[16px] font-bold text-[#15110F] truncate">{card.title}</h3>
                    <p className="text-[12px] text-[#6B6560] line-clamp-2 leading-relaxed">
                      {card.description}
                    </p>

                    {Array.isArray(card.details) && card.details.length > 0 && (
                      <div className="pt-1.5 border-t border-[#E6E2DB] space-y-0.5">
                        {card.details.slice(0, 3).map((d, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-[11px] text-[#15110F]/80"
                          >
                            <span className="truncate">{d.label}</span>
                            <span className="font-mono font-semibold text-[#C4262E] shrink-0 ml-2">
                              {d.value}
                            </span>
                          </div>
                        ))}
                        {card.details.length > 3 && (
                          <div className="text-[10px] font-mono text-[#6B6560]">
                            +{card.details.length - 3} more detail line(s)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-[#E6E2DB] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openEditCard(card)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-[8px] bg-[#F6F4F0] hover:bg-[#15110F] hover:text-white text-[12px] font-medium text-[#15110F] transition-colors cursor-pointer"
                  >
                    <Edit3 size={14} />
                    <span>{hasPhoto ? 'Edit Card & Photo' : 'Upload Photo & Edit Details'}</span>
                  </button>

                  <KebabMenu
                    actions={[
                      { label: 'Edit station card', onClick: () => openEditCard(card) },
                      {
                        label:
                          card.is_active !== false ? 'Hide from homepage' : 'Publish on homepage',
                        onClick: () => {
                          const nextCards = section.cards.map((c) =>
                            c.id === card.id ? { ...c, is_active: c.is_active === false } : c
                          );
                          void persistSection({ ...section, cards: nextCards });
                        },
                      },
                      {
                        label: 'Remove card',
                        danger: true,
                        onClick: () => setDeleteTarget(card),
                      },
                    ]}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Station Card Drawer */}
      <Drawer
        open={drawerOpen}
        title={
          editingCardId ? `Edit Station ${cNum}: ${cTitle || 'Card'}` : 'Add New Station Card'
        }
        onClose={() => setDrawerOpen(false)}
        onSave={(e) => void handleSaveCard(e)}
        isSaving={saving}
      >
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Station #" required>
            <input
              type="text"
              required
              placeholder="03"
              value={cNum}
              onChange={(e) => setCNum(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] font-mono text-[14px]"
            />
          </FormField>
          <div className="col-span-2">
            <FormField label="Station Title" required>
              <input
                type="text"
                required
                placeholder="e.g. Nail Studio"
                value={cTitle}
                onChange={(e) => setCTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
              />
            </FormField>
          </div>
        </div>

        <ImageUploader
          label="Station Card Picture"
          imageUrl={cImageUrl}
          altText={cImageAlt || cTitle}
          folder="site-slots"
          onChange={(url, alt) => {
            setCImageUrl(url);
            if (alt) setCImageAlt(alt);
            // If editing an existing card, immediately persist the uploaded photo to Supabase!
            if (editingCardId) {
              const updatedCards = section.cards.map((c) =>
                c.id === editingCardId
                  ? { ...c, image_url: url, image_alt: alt || c.image_alt }
                  : c
              );
              void persistSection(
                { ...section, cards: updatedCards },
                url
                  ? 'Station photo uploaded and live on website & Supabase!'
                  : 'Station photo removed and synced with Supabase.'
              );
            }
          }}
        />

        <FormField label="Description" required>
          <textarea
            rows={3}
            required
            placeholder="Describe what happens at this station..."
            value={cDescription}
            onChange={(e) => setCDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>

        {/* Editable Detail / Pricing Rows */}
        <div className="space-y-2 pt-2 border-t border-[#E6E2DB]">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-semibold text-[#15110F]">
              Card Detailing &amp; Starting Prices / Durations
            </label>
            <button
              type="button"
              onClick={() =>
                setCDetails([...cDetails, { label: '', value: 'from ₹1,000' }])
              }
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[#C4262E] hover:underline cursor-pointer"
            >
              <Plus size={14} />
              <span>Add detail row</span>
            </button>
          </div>
          <p className="text-[11px] text-[#6B6560]">
            These lines appear inside the station card below the description (e.g. service name on
            left, price or course duration on right).
          </p>

          <div className="space-y-2">
            {cDetails.map((row, rIdx) => (
              <div key={rIdx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Service or Course name"
                  value={row.label}
                  onChange={(e) => {
                    const next = [...cDetails];
                    next[rIdx] = { ...next[rIdx], label: e.target.value };
                    setCDetails(next);
                  }}
                  className="flex-1 px-2.5 py-1.5 rounded-[8px] border border-[#E6E2DB] text-[13px]"
                />
                <input
                  type="text"
                  placeholder="from ₹900 / 8 Weeks"
                  value={row.value}
                  onChange={(e) => {
                    const next = [...cDetails];
                    next[rIdx] = { ...next[rIdx], value: e.target.value };
                    setCDetails(next);
                  }}
                  className="w-36 px-2.5 py-1.5 rounded-[8px] border border-[#E6E2DB] font-mono text-[12px]"
                />
                <button
                  type="button"
                  onClick={() => setCDetails(cDetails.filter((_, i) => i !== rIdx))}
                  className="p-1.5 rounded-[6px] text-[#B3261E] hover:bg-[#B3261E]/10 cursor-pointer"
                  aria-label="Remove detail row"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E6E2DB]">
          <FormField label="Theme / Sticker Accent">
            <select
              value={cRoom}
              onChange={(e) => setCRoom(e.target.value as RoomId)}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[13px]"
            >
              <option value="hair">Hair / Grooming (Scissors)</option>
              <option value="nails">Nail Studio (Nail Polish)</option>
              <option value="makeup">Makeup &amp; Bridal (Lipstick)</option>
              <option value="skin">Skin &amp; Facials (Botanical)</option>
              <option value="academy">Bbold Academy (Academy Star)</option>
            </select>
          </FormField>

          <FormField label="Linked Category">
            <input
              type="text"
              placeholder="e.g. Nails, Makeup, Academy"
              value={cCategoryKey}
              onChange={(e) => setCCategoryKey(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[13px]"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Button Label">
            <input
              type="text"
              placeholder="Explore Nail Studio →"
              value={cLinkLabel}
              onChange={(e) => setCLinkLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[13px]"
            />
          </FormField>
          <FormField label="Button Link URL">
            <input
              type="text"
              placeholder="/services?category=Nails"
              value={cLinkTo}
              onChange={(e) => setCLinkTo(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] font-mono text-[13px]"
            />
          </FormField>
        </div>

        <label className="flex items-center justify-between p-3 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] cursor-pointer">
          <span className="text-[12px] font-medium">
            {cIsActive ? 'Published on homepage' : 'Hidden from homepage'}
          </span>
          <input
            type="checkbox"
            checked={cIsActive}
            onChange={(e) => setCIsActive(e.target.checked)}
            className="w-4 h-4 accent-[#C4262E]"
          />
        </label>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Remove "${deleteTarget?.title || 'station card'}"?`}
        description="This removes the card from Section 02 on the homepage. You can undo this for 10 seconds."
        confirmLabel="Remove card"
        onConfirm={() => void handleDeleteCard()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

// =============================================================================
// 1B. HOMEPAGE SECTION 04 MANAGER: "04 / Real Transformations"
//     Upload Before/After Slider Photos + Edit Descriptions + Add/Edit/Remove Lookbook Cards
// =============================================================================

export const AdminRealTransformationsPage: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
  const { refreshSiteData } = useSiteData();
  const [section, setSection] = useState<HomepageTransformationsSection>(
    DEFAULT_HOMEPAGE_TRANSFORMATIONS_SECTION
  );
  const [siteImages, setSiteImages] = useState<Record<string, SiteImageRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Transformation Card Drawer State
  const [cardDrawerOpen, setCardDrawerOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [tTitle, setTTitle] = useState('');
  const [tDescription, setTDescription] = useState('');
  const [tCategory, setTCategory] = useState('Hair');
  const [tDetailTag, setTDetailTag] = useState('');
  const [tImageUrl, setTImageUrl] = useState<string | null>(null);
  const [tBeforeUrl, setTBeforeUrl] = useState<string | null>(null);
  const [tSlot, setTSlot] = useState('transform_card_1');
  const [tLinkTo, setTLinkTo] = useState('/gallery');
  const [tIsActive, setTIsActive] = useState(true);

  const [deleteCardTarget, setDeleteCardTarget] = useState<HomepageTransformationCard | null>(
    null
  );

  const loadTransformationsData = useCallback(async () => {
    setLoading(true);
    try {
      const [texts, imgs] = await Promise.all([getPublicSiteTexts(), getPublicSiteImages()]);
      setSiteImages(imgs);
      const raw = texts.transformations || DEFAULT_HOMEPAGE_TRANSFORMATIONS_SECTION;
      const cards = (
        Array.isArray(raw.cards) ? raw.cards : DEFAULT_HOMEPAGE_TRANSFORMATIONS_SECTION.cards
      )
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((c, idx) => {
          const slotKey = c.slot || `transform_card_${idx + 1}`;
          return {
            ...c,
            slot: slotKey,
            image_url: c.image_url || imgs[slotKey]?.image_url || null,
          };
        });

      setSection({
        eyebrow: raw.eyebrow || DEFAULT_HOMEPAGE_TRANSFORMATIONS_SECTION.eyebrow,
        heading: raw.heading || DEFAULT_HOMEPAGE_TRANSFORMATIONS_SECTION.heading,
        ctaLabel: raw.ctaLabel || DEFAULT_HOMEPAGE_TRANSFORMATIONS_SECTION.ctaLabel,
        ctaLink: raw.ctaLink || DEFAULT_HOMEPAGE_TRANSFORMATIONS_SECTION.ctaLink,
        beforeAfter: {
          ...DEFAULT_HOMEPAGE_TRANSFORMATIONS_SECTION.beforeAfter,
          ...(raw.beforeAfter || {}),
          before_image_url:
            raw.beforeAfter?.before_image_url || imgs['transform_before']?.image_url || null,
          after_image_url:
            raw.beforeAfter?.after_image_url || imgs['transform_after']?.image_url || null,
        },
        cards,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTransformationsData();
  }, [loadTransformationsData]);

  const persistTransformations = async (
    nextSection: HomepageTransformationsSection,
    message = 'Saved to website and Supabase database.'
  ) => {
    setSaving(true);
    try {
      const normalizedCards = nextSection.cards.map((c, idx) => ({
        ...c,
        sort_order: idx + 1,
      }));
      const payload: HomepageTransformationsSection = {
        ...nextSection,
        cards: normalizedCards,
      };
      await adminSaveTransformationsSection(payload);
      setSection(payload);
      await refreshSiteData();
      const imgs = await getPublicSiteImages();
      setSiteImages(imgs);
      setToast({ id: String(Date.now()), text: message });
    } finally {
      setSaving(false);
    }
  };

  const openAddTransCard = () => {
    setEditingCardId(null);
    setTTitle('');
    setTDescription('');
    setTCategory('Hair');
    setTDetailTag('Salon Transformation');
    setTImageUrl(null);
    setTBeforeUrl(null);
    setTSlot(`transform_card_${section.cards.length + 1}`);
    setTLinkTo('/gallery');
    setTIsActive(true);
    setCardDrawerOpen(true);
  };

  const openEditTransCard = (card: HomepageTransformationCard) => {
    setEditingCardId(card.id);
    setTTitle(card.title || '');
    setTDescription(card.description || '');
    setTCategory(card.category || 'Hair');
    setTDetailTag(card.detail_tag || '');
    setTImageUrl(card.image_url || (card.slot ? siteImages[card.slot]?.image_url || null : null));
    setTBeforeUrl(card.before_image_url || null);
    setTSlot(card.slot || 'transform_card_1');
    setTLinkTo(card.linkTo || '/gallery');
    setTIsActive(card.is_active !== false);
    setCardDrawerOpen(true);
  };

  const handleSaveTransCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const cardObj: HomepageTransformationCard = {
      id: editingCardId || `transform-card-${Date.now()}`,
      title: tTitle.trim() || 'Styled at Bbold Mumbai',
      description: tDescription.trim(),
      category: tCategory,
      detail_tag: tDetailTag.trim() || undefined,
      image_url: tImageUrl,
      before_image_url: tBeforeUrl,
      slot: tSlot || `transform_card_${section.cards.length + 1}`,
      linkTo: tLinkTo.trim() || '/gallery',
      is_active: tIsActive,
      sort_order: editingCardId
        ? section.cards.find((x) => x.id === editingCardId)?.sort_order ?? section.cards.length + 1
        : section.cards.length + 1,
    };

    const nextCards = editingCardId
      ? section.cards.map((c) => (c.id === editingCardId ? cardObj : c))
      : [...section.cards, cardObj];

    setCardDrawerOpen(false);
    await persistTransformations(
      { ...section, cards: nextCards },
      editingCardId
        ? `Updated "${cardObj.title}" and synced to Supabase.`
        : `Added "${cardObj.title}" and synced to Supabase.`
    );

    // Also sync to gallery_items if a photo was uploaded so /gallery shows it too!
    if (cardObj.image_url) {
      await adminUpsertGalleryItem({
        id: cardObj.id.startsWith('50000000-') ? cardObj.id : undefined,
        image_url: cardObj.image_url,
        before_image_url: cardObj.before_image_url || null,
        caption: `${cardObj.title}${cardObj.description ? ` — ${cardObj.description}` : ''}`,
        category: cardObj.category,
        is_active: cardObj.is_active,
        is_sample: false,
      }).catch(() => {});
    }
  };

  const handleMoveTransCard = async (card: HomepageTransformationCard, dir: -1 | 1) => {
    const idx = section.cards.findIndex((c) => c.id === card.id);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= section.cards.length) return;
    const copy = [...section.cards];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    await persistTransformations(
      { ...section, cards: copy },
      'Transformation cards order updated in Supabase.'
    );
  };

  const handleDeleteTransCard = async () => {
    if (!deleteCardTarget) return;
    const removed = deleteCardTarget;
    const prevCards = [...section.cards];
    setDeleteCardTarget(null);
    const nextCards = section.cards.filter((c) => c.id !== removed.id);
    await persistTransformations(
      { ...section, cards: nextCards },
      `Removed "${removed.title}" from Real Transformations.`
    );
    setToast({
      id: String(Date.now()),
      text: `Removed "${removed.title}".`,
      onUndo: () => {
        void persistTransformations({ ...section, cards: prevCards }, 'Restored card.');
      },
    });
  };

  return (
    <div className="space-y-6 min-w-0">
      {!embedded ? (
        <PageHeader
          title="04 / Real Transformations (Before & After Lookbook)"
          description="Upload Before & After comparison photos, edit transformation titles and descriptions, and add, edit, or remove lookbook cards on the homepage."
          helpText="All photos and descriptions in '04 / Real Transformations' save directly to Supabase and appear immediately across all devices."
          primaryActionLabel="Add transformation card"
          onPrimaryAction={openAddTransCard}
        />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB]">
          <div>
            <h2 className="text-[16px] font-semibold text-[#15110F]">
              Homepage Section 04 — Real Transformations (Before &amp; After Lookbook)
            </h2>
            <p className="text-[13px] text-[#6B6560]">
              Upload Before &amp; After slider photos, edit titles and descriptions, or add, edit,
              and remove lookbook cards.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddTransCard}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#C4262E] text-white text-[13px] font-medium hover:opacity-95 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Add transformation card</span>
          </button>
        </div>
      )}

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : (
        <>
          {/* PART 1: INTERACTIVE BEFORE & AFTER COMPARISON SLIDER EDITOR */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void persistTransformations(
                section,
                'Before & After transformation details saved to Supabase!'
              );
            }}
            className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E6E2DB]">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#C4262E] font-bold">
                  Left Column — Interactive Comparison Slider
                </span>
                <h3 className="text-[16px] font-semibold text-[#15110F]">
                  Featured Before &amp; After Transformation
                </h3>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-[8px] bg-[#C4262E] hover:bg-[#15110F] text-white text-[13px] font-medium transition-colors cursor-pointer shrink-0"
              >
                {saving ? 'Saving...' : 'Save Before & After changes'}
              </button>
            </div>

            {/* Section Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Section Eyebrow">
                <input
                  type="text"
                  value={section.eyebrow}
                  onChange={(e) => setSection({ ...section, eyebrow: e.target.value })}
                  className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] font-mono text-[13px]"
                />
              </FormField>
              <FormField label="Section Heading">
                <input
                  type="text"
                  value={section.heading}
                  onChange={(e) => setSection({ ...section, heading: e.target.value })}
                  className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
                />
              </FormField>
              <FormField label="Button Label">
                <input
                  type="text"
                  value={section.ctaLabel}
                  onChange={(e) => setSection({ ...section, ctaLabel: e.target.value })}
                  className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[13px]"
                />
              </FormField>
            </div>

            {/* Side-by-Side Before & After Image Uploaders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-4 rounded-[10px] bg-[#F6F4F0] border border-[#E6E2DB]">
                <ImageUploader
                  label="1. BEFORE Photo (Left side of slider)"
                  imageUrl={section.beforeAfter.before_image_url}
                  altText={`Before — ${section.beforeAfter.title}`}
                  folder="gallery-before"
                  onChange={(url) => {
                    const next: HomepageTransformationsSection = {
                      ...section,
                      beforeAfter: {
                        ...section.beforeAfter,
                        before_image_url: url,
                      },
                    };
                    setSection(next);
                    void persistTransformations(
                      next,
                      url
                        ? 'Before photo uploaded and live on website & Supabase!'
                        : 'Before photo removed and synced with Supabase.'
                    );
                  }}
                />
              </div>

              <div className="p-4 rounded-[10px] bg-[#F6F4F0] border border-[#E6E2DB]">
                <ImageUploader
                  label="2. AFTER Photo (Right side of slider)"
                  imageUrl={section.beforeAfter.after_image_url}
                  altText={`After — ${section.beforeAfter.title}`}
                  folder="gallery"
                  onChange={(url) => {
                    const next: HomepageTransformationsSection = {
                      ...section,
                      beforeAfter: {
                        ...section.beforeAfter,
                        after_image_url: url,
                      },
                    };
                    setSection(next);
                    void persistTransformations(
                      next,
                      url
                        ? 'After photo uploaded and live on website & Supabase!'
                        : 'After photo removed and synced with Supabase.'
                    );
                  }}
                />
              </div>
            </div>

            {/* Before & After Title, Category, Technique Note, and Description */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <FormField label="Transformation Title" required>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dimensional Caramel Balayage & Gloss"
                  value={section.beforeAfter.title}
                  onChange={(e) =>
                    setSection({
                      ...section,
                      beforeAfter: { ...section.beforeAfter, title: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
                />
              </FormField>

              <FormField label="Category Badge">
                <select
                  value={section.beforeAfter.category}
                  onChange={(e) =>
                    setSection({
                      ...section,
                      beforeAfter: { ...section.beforeAfter, category: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
                >
                  <option value="Hair">Hair</option>
                  <option value="Hair Colour">Hair Colour</option>
                  <option value="Makeup">Makeup</option>
                  <option value="Bridal">Bridal</option>
                  <option value="Nails">Nails</option>
                  <option value="Skin">Skin</option>
                  <option value="Academy">Academy</option>
                </select>
              </FormField>

              <FormField label="Detail / Technique Note">
                <input
                  type="text"
                  placeholder="e.g. Freehand Balayage · Gloss Toner"
                  value={section.beforeAfter.detail_note || ''}
                  onChange={(e) =>
                    setSection({
                      ...section,
                      beforeAfter: { ...section.beforeAfter, detail_note: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[13px]"
                />
              </FormField>
            </div>

            <FormField label="Before & After Description / Caption" required>
              <textarea
                rows={2}
                required
                placeholder="Describe the transformation shown in the Before & After slider..."
                value={section.beforeAfter.caption}
                onChange={(e) =>
                  setSection({
                    ...section,
                    beforeAfter: { ...section.beforeAfter, caption: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
              />
            </FormField>
          </form>

          {/* PART 2: TRANSFORMATION LOOKBOOK CARDS (RIGHT COLUMN OF SECTION 04) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-semibold text-[#15110F]">
                  Transformation Lookbook Cards ({section.cards.length})
                </h3>
                <p className="text-[13px] text-[#6B6560]">
                  These cards appear on the right side of &ldquo;04 / Real Transformations&rdquo; on
                  the homepage. You can upload photos, edit descriptions, reorder, add, or remove
                  cards.
                </p>
              </div>
              <button
                type="button"
                onClick={openAddTransCard}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#15110F] hover:bg-[#C4262E] text-white text-[13px] font-medium transition-colors cursor-pointer shrink-0"
              >
                <Plus size={16} />
                <span>Add transformation card</span>
              </button>
            </div>

            {section.cards.length === 0 ? (
              <EmptyState
                description="No transformation lookbook cards yet. Click below to add your first card."
                actionLabel="Add transformation card"
                onAction={openAddTransCard}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {section.cards.map((card, idx) => {
                  const hasPhoto = Boolean(card.image_url);
                  return (
                    <div
                      key={card.id}
                      className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-[#E8A317]/30 font-mono text-[11px] font-bold text-[#15110F]">
                              Card 0{idx + 1}
                            </span>
                            <StatusBadge
                              variant={hasPhoto ? 'published' : 'sample'}
                              label={hasPhoto ? 'Custom photo' : 'Illustration'}
                            />
                            <StatusBadge
                              variant={card.is_active !== false ? 'published' : 'hidden'}
                            />
                          </div>
                          <ReorderButtons
                            disableUp={idx === 0}
                            disableDown={idx === section.cards.length - 1}
                            onMoveUp={() => void handleMoveTransCard(card, -1)}
                            onMoveDown={() => void handleMoveTransCard(card, 1)}
                          />
                        </div>

                        <div
                          onClick={() => openEditTransCard(card)}
                          className="h-40 rounded-[10px] bg-[#F6F4F0] border border-[#E6E2DB] overflow-hidden flex items-center justify-center cursor-pointer group"
                        >
                          {hasPhoto && card.image_url ? (
                            <img
                              src={card.image_url}
                              alt={card.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="text-center p-4">
                              <span className="font-mono text-[11px] text-[#6B6560] block">
                                No photo uploaded yet
                              </span>
                              <span className="text-[12px] font-semibold text-[#C4262E] underline mt-1 block">
                                Click to upload photo
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[11px] font-mono text-[#C4262E] font-bold uppercase">
                            <span>{card.category}</span>
                            {card.detail_tag && (
                              <span className="text-[#6B6560]">· {card.detail_tag}</span>
                            )}
                          </div>
                          <h4 className="text-[15px] font-bold text-[#15110F]">{card.title}</h4>
                          <p className="text-[12px] text-[#6B6560] line-clamp-2 leading-relaxed">
                            {card.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#E6E2DB] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => openEditTransCard(card)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-[8px] bg-[#F6F4F0] hover:bg-[#15110F] hover:text-white text-[12px] font-medium text-[#15110F] transition-colors cursor-pointer"
                        >
                          <Edit3 size={14} />
                          <span>{hasPhoto ? 'Edit Card & Photo' : 'Upload Photo & Edit'}</span>
                        </button>

                        <KebabMenu
                          actions={[
                            {
                              label: 'Edit card & photo',
                              onClick: () => openEditTransCard(card),
                            },
                            {
                              label:
                                card.is_active !== false
                                  ? 'Hide from homepage'
                                  : 'Publish on homepage',
                              onClick: () => {
                                const nextCards = section.cards.map((c) =>
                                  c.id === card.id
                                    ? { ...c, is_active: c.is_active === false }
                                    : c
                                );
                                void persistTransformations({ ...section, cards: nextCards });
                              },
                            },
                            {
                              label: 'Remove card',
                              danger: true,
                              onClick: () => setDeleteCardTarget(card),
                            },
                          ]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Transformation Card Drawer */}
      <Drawer
        open={cardDrawerOpen}
        title={editingCardId ? `Edit Transformation Card: ${tTitle}` : 'Add Transformation Card'}
        onClose={() => setCardDrawerOpen(false)}
        onSave={(e) => void handleSaveTransCard(e)}
        isSaving={saving}
      >
        <FormField label="Card Title / Look Name" required>
          <input
            type="text"
            required
            placeholder="e.g. Soft-Matte Bridal & Reception Glam"
            value={tTitle}
            onChange={(e) => setTTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Category">
            <select
              value={tCategory}
              onChange={(e) => setTCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
            >
              <option value="Hair">Hair</option>
              <option value="Hair Colour">Hair Colour</option>
              <option value="Makeup">Makeup</option>
              <option value="Bridal">Bridal</option>
              <option value="Nails">Nails</option>
              <option value="Skin">Skin</option>
              <option value="Academy">Academy</option>
            </select>
          </FormField>

          <FormField label="Detail / Service Badge">
            <input
              type="text"
              placeholder="e.g. Cut & Blow-Dry"
              value={tDetailTag}
              onChange={(e) => setTDetailTag(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[13px]"
            />
          </FormField>
        </div>

        <FormField label="Detailed Description" required>
          <textarea
            rows={3}
            required
            placeholder="Describe the techniques, products, and finish shown in this transformation..."
            value={tDescription}
            onChange={(e) => setTDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>

        <ImageUploader
          label="Transformation Card Photo (Main / After)"
          imageUrl={tImageUrl}
          altText={tTitle}
          folder="gallery"
          onChange={(url) => {
            setTImageUrl(url);
            if (editingCardId) {
              const updatedCards = section.cards.map((c) =>
                c.id === editingCardId ? { ...c, image_url: url } : c
              );
              void persistTransformations(
                { ...section, cards: updatedCards },
                url
                  ? 'Card photo uploaded and live on website & Supabase!'
                  : 'Card photo removed and synced with Supabase.'
              );
            }
          }}
        />

        <ImageUploader
          label="Optional Before Photo (if you also want this look in Before/After gallery filter)"
          imageUrl={tBeforeUrl}
          altText={`Before ${tTitle}`}
          folder="gallery-before"
          onChange={(url) => setTBeforeUrl(url)}
        />

        <FormField label="Click Destination Link">
          <input
            type="text"
            placeholder="/gallery"
            value={tLinkTo}
            onChange={(e) => setTLinkTo(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] border border-[#E6E2DB] font-mono text-[13px]"
          />
        </FormField>

        <label className="flex items-center justify-between p-3 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] cursor-pointer">
          <span className="text-[12px] font-medium">
            {tIsActive ? 'Published on homepage' : 'Hidden from homepage'}
          </span>
          <input
            type="checkbox"
            checked={tIsActive}
            onChange={(e) => setTIsActive(e.target.checked)}
            className="w-4 h-4 accent-[#C4262E]"
          />
        </label>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteCardTarget)}
        title={`Remove "${deleteCardTarget?.title || 'transformation card'}"?`}
        description="This removes the card from Section 04 on the homepage. You can undo this for 10 seconds."
        confirmLabel="Remove card"
        onConfirm={() => void handleDeleteTransCard()}
        onCancel={() => setDeleteCardTarget(null)}
      />

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

// =============================================================================
// 1C. PHOTOS & GALLERY PAGE (/admin/photos — 4 Tabs: Stations, Transformations, Gallery, Website Slots)
// =============================================================================

export const AdminPhotosGalleryPage: React.FC = () => {
  const { refreshSiteData } = useSiteData();
  const [activeTab, setActiveTab] = useState<
    'stations' | 'transformations' | 'gallery' | 'slots'
  >('stations');

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

      {/* Four Tabs: "02 / Six Stations", "04 / Real Transformations", "Full Gallery", & "Website Photo Slots" */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E6E2DB]">
        <button
          type="button"
          onClick={() => setActiveTab('stations')}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'stations'
              ? 'border-[#C4262E] text-[#C4262E]'
              : 'border-transparent text-[#6B6560] hover:text-[#15110F]'
          }`}
        >
          <Layers size={15} />
          <span>02 / Six Stations Cards</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transformations')}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'transformations'
              ? 'border-[#C4262E] text-[#C4262E]'
              : 'border-transparent text-[#6B6560] hover:text-[#15110F]'
          }`}
        >
          <Sparkles size={15} />
          <span>04 / Real Transformations</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('gallery')}
          className={`px-4 py-2.5 text-[14px] font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'gallery'
              ? 'border-[#C4262E] text-[#C4262E]'
              : 'border-transparent text-[#6B6560] hover:text-[#15110F]'
          }`}
        >
          Full Gallery ({galleryItems.length})
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
          All Website Photo Slots ({IMAGE_SLOT_LIST.length})
        </button>
      </div>

      {activeTab === 'stations' ? (
        <AdminHomepageStationsPage embedded />
      ) : activeTab === 'transformations' ? (
        <AdminRealTransformationsPage embedded />
      ) : loading ? (
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
// 3. DATA TOOLS PAGE (/admin/data-tools — Supabase SQL Download, Connection Progress, Export/Import JSON, Remove sample)
// =============================================================================

export const AdminDataToolsPage: React.FC = () => {
  const { refreshSiteData } = useSiteData();
  const [sampleCounts, setSampleCounts] = useState<SampleContentCounts | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [connReport, setConnReport] = useState<SupabaseConnectionReport | null>(null);
  const [checkingConn, setCheckingConn] = useState(false);
  const [generatingSql, setGeneratingSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [sqlPreviewOpen, setSqlPreviewOpen] = useState(false);
  const [sqlText, setSqlText] = useState<string>('');

  const loadCounts = useCallback(async () => {
    setSampleCounts(await getSampleContentCounts());
  }, []);

  const handleRefreshConnection = useCallback(async (showToast = false) => {
    setCheckingConn(true);
    try {
      const report = await checkSupabaseConnectionProgress();
      setConnReport(report);
      if (showToast) {
        setToast({
          id: String(Date.now()),
          text: `Connection checked (${report.checkedAt}): ${report.statusLabel} (${report.progressPercent}%).`,
        });
      }
    } finally {
      setCheckingConn(false);
    }
  }, []);

  useEffect(() => {
    void loadCounts();
    void handleRefreshConnection(false);
  }, [loadCounts, handleRefreshConnection]);

  const handleDownloadSupabaseSql = async () => {
    setGeneratingSql(true);
    try {
      const sql = await generateCompleteSupabaseSql();
      setSqlText(sql);
      const blob = new Blob([sql], { type: 'application/sql;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bbold-supabase-setup-${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast({
        id: String(Date.now()),
        text: 'Supabase SQL file downloaded. Paste and run it in your Supabase SQL Editor.',
      });
    } finally {
      setGeneratingSql(false);
    }
  };

  const handleCopySupabaseSql = async () => {
    setGeneratingSql(true);
    try {
      const sql = sqlText || (await generateCompleteSupabaseSql());
      setSqlText(sql);
      await navigator.clipboard.writeText(sql);
      setCopiedSql(true);
      window.setTimeout(() => setCopiedSql(false), 3000);
      setToast({
        id: String(Date.now()),
        text: 'Complete Supabase SQL copied to clipboard! Paste it in the Supabase SQL Editor.',
      });
    } finally {
      setGeneratingSql(false);
    }
  };

  const handleToggleSqlPreview = async () => {
    if (!sqlPreviewOpen && !sqlText) {
      setGeneratingSql(true);
      try {
        const sql = await generateCompleteSupabaseSql();
        setSqlText(sql);
      } finally {
        setGeneratingSql(false);
      }
    }
    setSqlPreviewOpen((prev) => !prev);
  };

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

  const badgeStyles =
    connReport?.overallState === 'connected'
      ? 'bg-[#1E7B4F]/15 text-[#1E7B4F] border-[#1E7B4F]/30'
      : connReport?.overallState === 'partial'
      ? 'bg-[#B7791F]/15 text-[#B7791F] border-[#B7791F]/30'
      : 'bg-[#B3261E]/15 text-[#B3261E] border-[#B3261E]/30';

  const barColor =
    connReport?.overallState === 'connected'
      ? 'bg-[#1E7B4F]'
      : connReport?.overallState === 'partial'
      ? 'bg-[#B7791F]'
      : 'bg-[#B3261E]';

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Data tools & Supabase SQL setup"
        description="Download the complete Supabase SQL script, verify your live Supabase connection progress, or manage JSON backups."
        helpText="Paste the downloaded SQL script into your Supabase SQL Editor and click Run, then click Refresh connection below to verify 100% setup."
      />

      {/* =====================================================================
          SUPABASE CONNECTION PROGRESS & LIVE VERIFICATION PANEL
         ===================================================================== */}
      <div className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6E2DB]">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <Database size={18} className="text-[#C4262E]" />
              <h2 className="text-[16px] font-semibold text-[#15110F]">
                Supabase Connection Status &amp; Progress
              </h2>
              {connReport && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-semibold border ${badgeStyles}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connReport.overallState === 'connected'
                        ? 'bg-[#1E7B4F]'
                        : connReport.overallState === 'partial'
                        ? 'bg-[#B7791F]'
                        : 'bg-[#B3261E]'
                    }`}
                  />
                  {connReport.statusLabel} ({connReport.progressPercent}%)
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#6B6560]">
              {connReport?.summaryMessage || 'Checking connection to Supabase...'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {connReport?.checkedAt && (
              <span className="text-[11px] font-mono text-[#6B6560]">
                Last checked: {connReport.checkedAt}
              </span>
            )}
            <button
              type="button"
              disabled={checkingConn}
              onClick={() => void handleRefreshConnection(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#15110F] hover:bg-[#C4262E] text-white text-[13px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={15} className={checkingConn ? 'animate-spin' : ''} />
              <span>{checkingConn ? 'Checking...' : 'Refresh connection'}</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[12px] font-mono">
            <span className="text-[#6B6560] uppercase tracking-wider">
              Setup Verification Progress
            </span>
            <span className="font-semibold text-[#15110F]">
              {connReport?.progressPercent ?? 0}% Complete
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#F6F4F0] border border-[#E6E2DB] overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.max(4, connReport?.progressPercent ?? 0)}%` }}
            />
          </div>
        </div>

        {/* 5-Step Diagnostic Checklist */}
        {connReport && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {connReport.steps.map((step) => (
              <div
                key={step.id}
                className="p-3.5 rounded-[10px] bg-[#F6F4F0] border border-[#E6E2DB] flex items-start gap-3"
              >
                <div className="mt-0.5 shrink-0">
                  {step.status === 'done' ? (
                    <CheckCircle2 size={18} className="text-[#1E7B4F]" />
                  ) : step.status === 'error' ? (
                    <AlertCircle size={18} className="text-[#B3261E]" />
                  ) : (
                    <Clock size={18} className="text-[#B7791F]" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-[#15110F]">
                      {step.label}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded font-semibold ${
                        step.status === 'done'
                          ? 'bg-[#1E7B4F]/15 text-[#1E7B4F]'
                          : step.status === 'error'
                          ? 'bg-[#B3261E]/15 text-[#B3261E]'
                          : 'bg-[#B7791F]/15 text-[#B7791F]'
                      }`}
                    >
                      {step.status === 'done'
                        ? 'Connected'
                        : step.status === 'error'
                        ? 'Action Needed'
                        : 'Pending'}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#6B6560] leading-snug">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Locked Admin Identity Box */}
        <div className="p-3.5 rounded-[10px] bg-[#F5F0E8] border border-[#E6E2DB] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-[#C4262E] shrink-0" />
            <div>
              <span className="font-semibold text-[#15110F]">
                Single-Admin Security Lock Active:
              </span>{' '}
              <span className="text-[#6B6560]">
                Only <code className="font-mono font-semibold text-[#15110F]">{ADMIN_ALLOWED_EMAIL}</code>{' '}
                (UID: <code className="font-mono font-semibold text-[#C4262E]">{ADMIN_ALLOWED_UID}</code>) is authorized in the SQL &amp; Admin Panel.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          DOWNLOAD / COPY COMPLETE SUPABASE SQL SCRIPT CARD
         ===================================================================== */}
      <div className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-[16px] font-semibold text-[#15110F]">
              Download Complete Supabase SQL Script (Ready for Supabase SQL Editor)
            </h2>
            <p className="text-[14px] text-[#6B6560] max-w-3xl">
              Generates a single, error-free PostgreSQL script containing all 14 tables, Row-Level
              Security (RLS) policies, booking &amp; availability RPCs, the <code className="font-mono">media</code> storage
              bucket, your current salon content, and the locked admin account (
              <code className="font-mono">{ADMIN_ALLOWED_EMAIL}</code> / UID{' '}
              <code className="font-mono">{ADMIN_ALLOWED_UID}</code>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={generatingSql}
              onClick={() => void handleDownloadSupabaseSql()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] bg-[#C4262E] hover:bg-[#15110F] text-white text-[14px] font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download size={16} />
              <span>{generatingSql ? 'Preparing SQL...' : 'Download Supabase SQL (.sql)'}</span>
            </button>

            <button
              type="button"
              disabled={generatingSql}
              onClick={() => void handleCopySupabaseSql()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] border border-[#E6E2DB] bg-[#F6F4F0] hover:bg-[#E6E2DB]/70 text-[#15110F] text-[14px] font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {copiedSql ? <Check size={16} className="text-[#1E7B4F]" /> : <Copy size={16} />}
              <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL to Clipboard'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleToggleSqlPreview()}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-[8px] border border-[#E6E2DB] bg-[#FFFFFF] hover:bg-[#F6F4F0] text-[#15110F] text-[13px] font-medium transition-colors cursor-pointer"
            >
              <Code2 size={16} />
              <span>{sqlPreviewOpen ? 'Hide SQL Preview' : 'View SQL'}</span>
            </button>
          </div>
        </div>

        {sqlPreviewOpen && sqlText && (
          <div className="pt-3 border-t border-[#E6E2DB] space-y-2">
            <div className="flex items-center justify-between text-[12px] font-mono text-[#6B6560]">
              <span>Paste this entire script into Supabase Dashboard → SQL Editor → New Query → Run</span>
              <span>{sqlText.split('\n').length} lines</span>
            </div>
            <pre className="p-4 rounded-[8px] bg-[#15110F] text-[#F5F0E8] font-mono text-[12px] overflow-x-auto max-h-[380px] overflow-y-auto leading-relaxed">
              {sqlText}
            </pre>
          </div>
        )}
      </div>

      {/* =====================================================================
          JSON BACKUP & SAMPLE CONTENT TOOLS
         ===================================================================== */}
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
