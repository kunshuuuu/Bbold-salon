import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Star, Edit3 } from 'lucide-react';
import {
  adminGetServices,
  adminRenameServiceCategory,
  adminUpsertService,
} from '../../lib/adminApi';
import { formatINR } from '../../config/site';
import {
  PageHeader,
  Toolbar,
  Drawer,
  FormField,
  RealContentToggle,
  StatusBadge,
  KebabMenu,
  ReorderButtons,
  EmptyState,
  AdminSkeleton,
  ToastContainer,
  type ToastMessage,
} from '../../components/admin/AdminUI';
import type { AudienceType, Service } from '../../types/database';

export const AdminServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Rename category modal state
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Create / Edit drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [price, setPrice] = useState(1000);
  const [category, setCategory] = useState('Hair');
  const [audience, setAudience] = useState<AudienceType>('all');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isRealContent, setIsRealContent] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminGetServices();
      setServices(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const categories = useMemo(() => {
    return Array.from(new Set(services.map((s) => s.category)));
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [services, categoryFilter, search]);

  const groupedServices = useMemo(() => {
    const map: Record<string, Service[]> = {};
    for (const srv of filteredServices) {
      if (!map[srv.category]) map[srv.category] = [];
      map[srv.category].push(srv);
    }
    return map;
  }, [filteredServices]);

  const openCreateDrawer = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setDurationMinutes(60);
    setPrice(1000);
    setCategory(categoryFilter !== 'All' ? categoryFilter : 'Hair');
    setAudience('all');
    setIsFeatured(false);
    setIsActive(true);
    setIsRealContent(true);
    setIsDirty(false);
    setDrawerOpen(true);
  };

  const openEditDrawer = (srv: Service) => {
    setEditingId(srv.id);
    setName(srv.name);
    setDescription(srv.description || '');
    setDurationMinutes(srv.duration_minutes);
    setPrice(Number(srv.price));
    setCategory(srv.category);
    setAudience(srv.audience);
    setIsFeatured(srv.is_featured);
    setIsActive(srv.is_active);
    setIsRealContent(true); // Default ON so editing clears is_sample unless unchecked
    setIsDirty(false);
    setDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await adminUpsertService({
        id: editingId || undefined,
        name: name.trim(),
        description: description.trim() || null,
        duration_minutes: Math.max(5, Number(durationMinutes) || 30),
        price: Math.max(0, Number(price) || 0),
        category: category.trim() || 'Hair',
        audience,
        is_featured: isFeatured,
        is_active: isActive,
        is_sample: !isRealContent,
      });
      setDrawerOpen(false);
      await loadServices();
      setToast({
        id: String(Date.now()),
        text: 'Saved. This is now live on your website.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (srv: Service) => {
    await adminUpsertService({
      name: `${srv.name} (Copy)`,
      description: srv.description,
      duration_minutes: srv.duration_minutes,
      price: Number(srv.price),
      category: srv.category,
      audience: srv.audience,
      is_featured: false,
      sort_order: srv.sort_order + 1,
      is_active: srv.is_active,
      is_sample: false,
    });
    await loadServices();
    setToast({
      id: String(Date.now()),
      text: 'Saved. This is now live on your website.',
    });
  };

  const handleToggleVisibility = async (srv: Service) => {
    await adminUpsertService({
      ...srv,
      is_active: !srv.is_active,
    });
    await loadServices();
    setToast({
      id: String(Date.now()),
      text: 'Saved. This is now live on your website.',
    });
  };

  const handleToggleFeatured = async (srv: Service) => {
    await adminUpsertService({
      ...srv,
      is_featured: !srv.is_featured,
    });
    await loadServices();
    setToast({
      id: String(Date.now()),
      text: 'Saved. This is now live on your website.',
    });
  };

  const handleMoveOrder = async (srv: Service, direction: -1 | 1, groupList: Service[]) => {
    const idx = groupList.findIndex((s) => s.id === srv.id);
    const swapTarget = groupList[idx + direction];
    if (!swapTarget) return;

    await Promise.all([
      adminUpsertService({ ...srv, sort_order: swapTarget.sort_order }),
      adminUpsertService({ ...swapTarget, sort_order: srv.sort_order }),
    ]);
    await loadServices();
  };

  const handleBulkVisibility = async (publish: boolean) => {
    for (const id of selectedIds) {
      const srv = services.find((s) => s.id === id);
      if (srv) {
        await adminUpsertService({ ...srv, is_active: publish });
      }
    }
    setSelectedIds([]);
    await loadServices();
    setToast({
      id: String(Date.now()),
      text: 'Saved. This is now live on your website.',
    });
  };

  const handleRenameCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingCategory || !newCategoryName.trim()) return;
    await adminRenameServiceCategory(renamingCategory, newCategoryName.trim());
    setRenamingCategory(null);
    setNewCategoryName('');
    await loadServices();
    setToast({
      id: String(Date.now()),
      text: 'Saved. This is now live on your website.',
    });
  };

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Services"
        description="Add, edit, reorder, or hide services across your salon menu and online booking page."
        helpText="Services are never permanently deleted so past appointment records stay intact. Use 'Hide from website' whenever a service is temporarily unavailable."
        primaryActionLabel="Add service"
        onPrimaryAction={openCreateDrawer}
      />

      <Toolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search services..."
      >
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
          className="px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
        >
          <option value="All">All categories ({services.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#E6E2DB] px-3 py-1.5 rounded-[8px]">
            <span className="text-[12px] font-medium">{selectedIds.length} selected</span>
            <button
              type="button"
              onClick={() => void handleBulkVisibility(true)}
              className="text-[12px] font-medium text-[#1E7B4F] hover:underline cursor-pointer"
            >
              Publish
            </button>
            <span className="text-[#E6E2DB]">|</span>
            <button
              type="button"
              onClick={() => void handleBulkVisibility(false)}
              className="text-[12px] font-medium text-[#B3261E] hover:underline cursor-pointer"
            >
              Hide from website
            </button>
          </div>
        )}
      </Toolbar>

      {/* Rename Category Modal Inline Bar */}
      {renamingCategory && (
        <form
          onSubmit={handleRenameCategorySubmit}
          className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#C4262E] flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-[14px]">
            <span>
              Rename category <strong>{renamingCategory}</strong> across all services to:
            </span>
            <input
              type="text"
              required
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="px-3 py-1.5 rounded-[8px] border border-[#E6E2DB] text-[14px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRenamingCategory(null)}
              className="px-3 py-1.5 rounded-[8px] border border-[#E6E2DB] text-[12px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-[8px] bg-[#C4262E] text-white text-[12px] font-medium cursor-pointer"
            >
              Rename category
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <AdminSkeleton rows={6} />
      ) : Object.keys(groupedServices).length === 0 ? (
        <EmptyState
          description="Add your first service to populate the menu and booking page."
          actionLabel="Add service"
          onAction={openCreateDrawer}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedServices).map(([catName, catServices]) => (
            <div
              key={catName}
              className="rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] overflow-hidden min-w-0"
            >
              {/* Category Header */}
              <div className="px-4 py-3 bg-[#F6F4F0] border-b border-[#E6E2DB] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-[16px] leading-[24px] font-semibold text-[#15110F]">
                    {catName}
                  </h2>
                  <span className="font-mono text-[12px] text-[#6B6560]">
                    ({catServices.length})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRenamingCategory(catName);
                    setNewCategoryName(catName);
                  }}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[#6B6560] hover:text-[#15110F] cursor-pointer"
                >
                  <Edit3 size={14} />
                  <span>Rename category</span>
                </button>
              </div>

              {/* Desktop / Tablet Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6E2DB] text-[12px] font-medium text-[#6B6560]">
                      <th className="py-2.5 px-4 w-10">
                        <input
                          type="checkbox"
                          aria-label={`Select all in ${catName}`}
                          checked={catServices.every((s) => selectedIds.includes(s.id))}
                          onChange={(e) => {
                            const ids = catServices.map((s) => s.id);
                            if (e.target.checked) {
                              setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
                            }
                          }}
                        />
                      </th>
                      <th className="py-2.5 px-3 w-24">Order</th>
                      <th className="py-2.5 px-4">Service</th>
                      <th className="py-2.5 px-4">Audience</th>
                      <th className="py-2.5 px-4">Duration &amp; Price</th>
                      <th className="py-2.5 px-4">Featured</th>
                      <th className="py-2.5 px-4">Visibility</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E2DB] text-[14px]">
                    {catServices.map((srv, idx) => (
                      <tr key={srv.id} className="h-[56px] hover:bg-[#F6F4F0]/40">
                        <td className="py-2.5 px-4">
                          <input
                            type="checkbox"
                            aria-label={`Select ${srv.name}`}
                            checked={selectedIds.includes(srv.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds((prev) => [...prev, srv.id]);
                              } else {
                                setSelectedIds((prev) => prev.filter((id) => id !== srv.id));
                              }
                            }}
                          />
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <ReorderButtons
                            disableUp={idx === 0}
                            disableDown={idx === catServices.length - 1}
                            onMoveUp={() => void handleMoveOrder(srv, -1, catServices)}
                            onMoveDown={() => void handleMoveOrder(srv, 1, catServices)}
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#15110F]">{srv.name}</span>
                            {srv.is_sample && <StatusBadge variant="sample" />}
                          </div>
                          {srv.description && (
                            <div className="text-[12px] text-[#6B6560] truncate max-w-md">
                              {srv.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 capitalize text-[13px] text-[#6B6560]">
                          {srv.audience}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[13px] whitespace-nowrap">
                          {srv.duration_minutes}m · <strong>{formatINR(srv.price)}</strong>
                        </td>
                        <td className="py-2.5 px-4">
                          <button
                            type="button"
                            onClick={() => void handleToggleFeatured(srv)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] cursor-pointer ${
                              srv.is_featured
                                ? 'text-[#B7791F] font-medium bg-[#B7791F]/10'
                                : 'text-[#6B6560] hover:bg-[#F6F4F0]'
                            }`}
                          >
                            <Star
                              size={14}
                              fill={srv.is_featured ? '#B7791F' : 'none'}
                            />
                            <span>{srv.is_featured ? 'Featured' : 'Standard'}</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <StatusBadge variant={srv.is_active ? 'published' : 'hidden'} />
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <KebabMenu
                            actions={[
                              { label: 'Edit service', onClick: () => openEditDrawer(srv) },
                              {
                                label: 'Duplicate service',
                                onClick: () => void handleDuplicate(srv),
                              },
                              {
                                label: srv.is_active ? 'Hide from website' : 'Publish on website',
                                onClick: () => void handleToggleVisibility(srv),
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
                {catServices.map((srv) => (
                  <div key={srv.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[15px]">{srv.name}</span>
                          {srv.is_sample && <StatusBadge variant="sample" />}
                          <StatusBadge variant={srv.is_active ? 'published' : 'hidden'} />
                        </div>
                        <div className="font-mono text-[13px] text-[#15110F] mt-0.5">
                          {srv.duration_minutes} mins · {formatINR(srv.price)}
                        </div>
                      </div>
                      <KebabMenu
                        actions={[
                          { label: 'Edit service', onClick: () => openEditDrawer(srv) },
                          {
                            label: 'Duplicate service',
                            onClick: () => void handleDuplicate(srv),
                          },
                          {
                            label: srv.is_active ? 'Hide from website' : 'Publish on website',
                            onClick: () => void handleToggleVisibility(srv),
                          },
                        ]}
                      />
                    </div>
                    {srv.description && (
                      <p className="text-[12px] text-[#6B6560]">{srv.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Service Drawer */}
      <Drawer
        open={drawerOpen}
        title={editingId ? 'Edit service' : 'Add service'}
        onClose={() => setDrawerOpen(false)}
        onSave={(e) => void handleSave(e)}
        isDirty={isDirty}
        isSaving={saving}
      >
        <FormField label="Service name" required>
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

        <FormField
          label="Category"
          required
          hint="Type an existing category name or create a new one"
        >
          <input
            type="text"
            list="service-categories-list"
            required
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setIsDirty(true);
            }}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          />
          <datalist id="service-categories-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Duration (minutes)" required>
            <input
              type="number"
              min={5}
              step={5}
              required
              value={durationMinutes}
              onChange={(e) => {
                setDurationMinutes(Number(e.target.value));
                setIsDirty(true);
              }}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[14px]"
            />
          </FormField>

          <FormField label="Price (₹)" required>
            <input
              type="number"
              min={0}
              step={10}
              required
              value={price}
              onChange={(e) => {
                setPrice(Number(e.target.value));
                setIsDirty(true);
              }}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[14px]"
            />
          </FormField>
        </div>

        <FormField label="Audience">
          <select
            value={audience}
            onChange={(e) => {
              setAudience(e.target.value as AudienceType);
              setIsDirty(true);
            }}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          >
            <option value="all">All clients</option>
            <option value="women">Women</option>
            <option value="men">Men</option>
          </select>
        </FormField>

        <FormField
          label="Description"
          hint="Keep to one factual sentence. Avoid unverified claims about brands or guaranteed results."
        >
          <textarea
            rows={3}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setIsDirty(true);
            }}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>

        <div className="space-y-2 pt-2">
          <label className="flex items-center justify-between p-3 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] cursor-pointer">
            <span className="text-[12px] font-medium">
              Highlight in &ldquo;Signature services&rdquo; strip
            </span>
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => {
                setIsFeatured(e.target.checked);
                setIsDirty(true);
              }}
              className="w-4 h-4 accent-[#C4262E]"
            />
          </label>

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
        </div>
      </Drawer>

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};
