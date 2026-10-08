import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminGetServices,
  adminGetStylists,
  adminUpsertStylist,
} from '../../lib/adminApi';
import {
  PageHeader,
  Toolbar,
  Drawer,
  FormField,
  ImageUploader,
  RealContentToggle,
  StatusBadge,
  KebabMenu,
  ReorderButtons,
  EmptyState,
  AdminSkeleton,
  ToastContainer,
  type ToastMessage,
} from '../../components/admin/AdminUI';
import type { Stylist } from '../../types/database';

export const AdminStylistsPage: React.FC = () => {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [serviceCategories, setServiceCategories] = useState<string[]>([
    'Hair',
    'Hair Colour',
    'Hair Treatments',
    "Men's Grooming",
    'Makeup',
    'Bridal',
    'Nails',
    'Skin',
    'Waxing & Threading',
    'Academy',
  ]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isRealContent, setIsRealContent] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stys, srvs] = await Promise.all([adminGetStylists(), adminGetServices()]);
      setStylists(stys);
      const cats = Array.from(new Set([...srvs.map((s) => s.category), 'Academy']));
      if (cats.length > 0) setServiceCategories(cats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredStylists = useMemo(() => {
    if (!search.trim()) return stylists;
    const q = search.trim().toLowerCase();
    return stylists.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.title || '').toLowerCase().includes(q) ||
        s.specialties.some((sp) => sp.toLowerCase().includes(q))
    );
  }, [stylists, search]);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setTitle('');
    setBio('');
    setPhotoUrl(null);
    setSpecialties(['Hair']);
    setIsActive(true);
    setIsRealContent(true);
    setIsDirty(false);
    setDrawerOpen(true);
  };

  const openEdit = (st: Stylist) => {
    setEditingId(st.id);
    setName(st.name);
    setTitle(st.title || '');
    setBio(st.bio || '');
    setPhotoUrl(st.photo_url);
    setSpecialties(st.specialties || []);
    setIsActive(st.is_active);
    setIsRealContent(true);
    setIsDirty(false);
    setDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await adminUpsertStylist({
        id: editingId || undefined,
        name: name.trim(),
        title: title.trim() || null,
        bio: bio.trim() || null,
        photo_url: photoUrl,
        specialties,
        is_active: isActive,
        is_sample: !isRealContent,
      });
      setDrawerOpen(false);
      await loadData();
      setToast({
        id: String(Date.now()),
        text: 'Saved. This is now live on your website.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (st: Stylist) => {
    await adminUpsertStylist({ ...st, is_active: !st.is_active });
    await loadData();
    setToast({
      id: String(Date.now()),
      text: 'Saved. This is now live on your website.',
    });
  };

  const handleMoveOrder = async (st: Stylist, direction: -1 | 1) => {
    const idx = stylists.findIndex((s) => s.id === st.id);
    const target = stylists[idx + direction];
    if (!target) return;
    await Promise.all([
      adminUpsertStylist({ ...st, sort_order: target.sort_order }),
      adminUpsertStylist({ ...target, sort_order: st.sort_order }),
    ]);
    await loadData();
  };

  const toggleSpecialty = (cat: string) => {
    setIsDirty(true);
    setSpecialties((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Stylists"
        description="Manage your salon team profiles, portraits, specialties, and booking availability."
        helpText="Active stylists appear on the Team page and in step 02 of the booking flow. Matching a stylist's specialties to your service categories links their profile directly to those services."
        primaryActionLabel="Add stylist"
        onPrimaryAction={openCreate}
      />

      <Toolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search stylists by name or specialty..."
      />

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : filteredStylists.length === 0 ? (
        <EmptyState
          description="Add your first stylist to display them on the Team page and booking flow."
          actionLabel="Add stylist"
          onAction={openCreate}
        />
      ) : (
        <div className="rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] overflow-hidden min-w-0">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6E2DB] bg-[#F6F4F0]/60 text-[12px] font-medium text-[#6B6560]">
                  <th className="py-3 px-4 w-24">Order</th>
                  <th className="py-3 px-4">Stylist</th>
                  <th className="py-3 px-4">Specialties</th>
                  <th className="py-3 px-4">Visibility</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E2DB] text-[14px]">
                {filteredStylists.map((st, idx) => (
                  <tr key={st.id} className="h-[56px] hover:bg-[#F6F4F0]/40">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <ReorderButtons
                        disableUp={idx === 0}
                        disableDown={idx === filteredStylists.length - 1}
                        onMoveUp={() => void handleMoveOrder(st, -1)}
                        onMoveDown={() => void handleMoveOrder(st, 1)}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F6F4F0] border border-[#E6E2DB] overflow-hidden flex items-center justify-center shrink-0">
                          {st.photo_url ? (
                            <img
                              src={st.photo_url}
                              alt={st.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-mono text-xs text-[#6B6560]">
                              {st.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#15110F]">{st.name}</span>
                            {st.is_sample && <StatusBadge variant="sample" />}
                          </div>
                          <div className="text-[12px] text-[#6B6560]">{st.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[13px] text-[#6B6560]">
                      {st.specialties.join(' · ') || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge variant={st.is_active ? 'published' : 'hidden'} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <KebabMenu
                        actions={[
                          { label: 'Edit stylist', onClick: () => openEdit(st) },
                          {
                            label: st.is_active ? 'Hide from website' : 'Publish on website',
                            onClick: () => void handleToggleVisibility(st),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="md:hidden divide-y divide-[#E6E2DB]">
            {filteredStylists.map((st) => (
              <div key={st.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[15px]">{st.name}</span>
                      {st.is_sample && <StatusBadge variant="sample" />}
                      <StatusBadge variant={st.is_active ? 'published' : 'hidden'} />
                    </div>
                    <div className="text-[12px] text-[#6B6560]">{st.title}</div>
                  </div>
                  <KebabMenu
                    actions={[
                      { label: 'Edit stylist', onClick: () => openEdit(st) },
                      {
                        label: st.is_active ? 'Hide from website' : 'Publish on website',
                        onClick: () => void handleToggleVisibility(st),
                      },
                    ]}
                  />
                </div>
                <div className="text-[12px] font-mono text-[#6B6560]">
                  {st.specialties.join(' · ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        title={editingId ? 'Edit stylist' : 'Add stylist'}
        onClose={() => setDrawerOpen(false)}
        onSave={(e) => void handleSave(e)}
        isDirty={isDirty}
        isSaving={saving}
      >
        <FormField label="Name" required>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setIsDirty(true);
            }}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>

        <FormField label="Role / Title">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. Senior Stylist, Lead Makeup Artist"
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>

        <ImageUploader
          label="Portrait photo (real salon portrait; illustration shows if empty)"
          imageUrl={photoUrl}
          altText={name}
          folder="stylists"
          onChange={(url) => {
            setPhotoUrl(url);
            setIsDirty(true);
          }}
        />

        <FormField label="Specialties (select matching service categories)">
          <div className="flex flex-wrap gap-2 pt-1">
            {serviceCategories.map((cat) => {
              const selected = specialties.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleSpecialty(cat)}
                  className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium border transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#C4262E] text-white border-[#C4262E]'
                      : 'bg-[#F6F4F0] text-[#15110F] border-[#E6E2DB]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </FormField>

        <FormField
          label="Short bio (40–60 words)"
          hint="Describe their craft and consultation style. Do not invent years of experience or awards."
        >
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              setIsDirty(true);
            }}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>

        <label className="flex items-center justify-between p-3 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] cursor-pointer">
          <span className="text-[12px] font-medium">
            {isActive ? 'Published on website' : 'Hidden from website'}
          </span>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => {
              setIsActive(e.target.checked);
              setIsDirty(true);
            }}
            className="w-4 h-4 accent-[#C4262E]"
          />
        </label>

        <RealContentToggle
          checked={isRealContent}
          onChange={(val) => {
            setIsRealContent(val);
            setIsDirty(true);
          }}
        />
      </Drawer>

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};
