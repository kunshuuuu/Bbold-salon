import React, { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import {
  adminDeleteCourse,
  adminDeleteFaq,
  adminDeleteTestimonial,
  adminGetCourses,
  adminGetEnquiries,
  adminGetFaqs,
  adminGetTestimonials,
  adminUpdateEnquiry,
  adminUpsertCourse,
  adminUpsertFaq,
  adminUpsertTestimonial,
} from '../../lib/adminApi';
import { buildWhatsAppUrl, formatINR } from '../../config/site';
import {
  PageHeader,
  Toolbar,
  Drawer,
  FormField,
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
  AcademyEnquiry,
  Course,
  EnquiryStatus,
  FaqItem,
  Testimonial,
} from '../../types/database';

// =============================================================================
// 1. COURSES ADMIN PAGE (/admin/courses)
// =============================================================================

export const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [durationText, setDurationText] = useState('');
  const [fee, setFee] = useState<string>('35000');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isRealContent, setIsRealContent] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      setCourses(await adminGetCourses());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setDurationText('2 months');
    setFee('40000');
    setDescription('');
    setIsActive(true);
    setIsRealContent(true);
    setIsDirty(false);
    setDrawerOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditingId(c.id);
    setName(c.name);
    setDurationText(c.duration_text || '');
    setFee(c.fee !== null ? String(c.fee) : '');
    setDescription(c.description || '');
    setIsActive(c.is_active);
    setIsRealContent(true);
    setIsDirty(false);
    setDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await adminUpsertCourse({
        id: editingId || undefined,
        name: name.trim(),
        duration_text: durationText.trim() || null,
        fee: fee.trim() ? Number(fee) : null,
        description: description.trim() || null,
        is_active: isActive,
        is_sample: !isRealContent,
      });
      setDrawerOpen(false);
      await loadCourses();
      setToast({
        id: String(Date.now()),
        text: 'Saved. This is now live on your website.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (c: Course, dir: -1 | 1) => {
    const idx = courses.findIndex((x) => x.id === c.id);
    const swap = courses[idx + dir];
    if (!swap) return;
    await Promise.all([
      adminUpsertCourse({ ...c, sort_order: swap.sort_order }),
      adminUpsertCourse({ ...swap, sort_order: c.sort_order }),
    ]);
    await loadCourses();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const backup = { ...deleteTarget };
    setDeleteTarget(null);
    await adminDeleteCourse(backup.id);
    await loadCourses();
    setToast({
      id: String(Date.now()),
      text: `Deleted course "${backup.name}".`,
      onUndo: () => {
        void adminUpsertCourse(backup).then(() => loadCourses());
      },
    });
  };

  const filtered = courses.filter((c) =>
    !search.trim() ? true : c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Courses"
        description="Manage training courses, syllabus details, and fees for the Bbold Academy page."
        helpText="Include a 2-sentence overview followed by numbered syllabus points in the description field so visitors can expand the syllabus accordion."
        primaryActionLabel="Add course"
        onPrimaryAction={openCreate}
      />

      <Toolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search courses..."
      />

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          description="Add your first training course to display on the Academy page."
          actionLabel="Add course"
          onAction={openCreate}
        />
      ) : (
        <div className="rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] overflow-hidden divide-y divide-[#E6E2DB]">
          {filtered.map((c, idx) => (
            <div
              key={c.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F6F4F0]/40"
            >
              <div className="flex items-start gap-3 min-w-0">
                <ReorderButtons
                  disableUp={idx === 0}
                  disableDown={idx === filtered.length - 1}
                  onMoveUp={() => void handleMove(c, -1)}
                  onMoveDown={() => void handleMove(c, 1)}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[15px] text-[#15110F]">{c.name}</span>
                    {c.is_sample && <StatusBadge variant="sample" />}
                    <StatusBadge variant={c.is_active ? 'published' : 'hidden'} />
                  </div>
                  <div className="font-mono text-[12px] text-[#C4262E] mt-0.5">
                    {c.duration_text || 'Flexible duration'} · {formatINR(c.fee)}
                  </div>
                  {c.description && (
                    <p className="text-[12px] text-[#6B6560] mt-1 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <KebabMenu
                  actions={[
                    { label: 'Edit course', onClick: () => openEdit(c) },
                    {
                      label: c.is_active ? 'Hide from website' : 'Publish on website',
                      onClick: () =>
                        void adminUpsertCourse({ ...c, is_active: !c.is_active }).then(() =>
                          loadCourses()
                        ),
                    },
                    {
                      label: 'Delete course',
                      danger: true,
                      onClick: () => setDeleteTarget(c),
                    },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        title={editingId ? 'Edit course' : 'Add course'}
        onClose={() => setDrawerOpen(false)}
        onSave={(e) => void handleSave(e)}
        isDirty={isDirty}
        isSaving={saving}
      >
        <FormField label="Course name" required>
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

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Duration (e.g. 2 months, 3 weeks)">
            <input
              type="text"
              value={durationText}
              onChange={(e) => {
                setDurationText(e.target.value);
                setIsDirty(true);
              }}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
            />
          </FormField>

          <FormField label="Course fee (₹)">
            <input
              type="number"
              min={0}
              step={500}
              value={fee}
              onChange={(e) => {
                setFee(e.target.value);
                setIsDirty(true);
              }}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[14px]"
            />
          </FormField>
        </div>

        <FormField
          label="Description & Syllabus"
          hint="Write 2 overview sentences, then list syllabus topics on new lines starting with 1., 2., etc."
        >
          <textarea
            rows={7}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this course?"
        description="Prefer 'Hide from website' if you may offer this course again. You can undo deletion for 10 seconds."
        confirmLabel="Delete course"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

// =============================================================================
// 2. ACADEMY ENQUIRIES PAGE (/admin/enquiries)
// =============================================================================

export const AdminEnquiriesPage: React.FC = () => {
  const [enquiries, setEnquiries] = useState<AcademyEnquiry[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | EnquiryStatus>('all');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [enq, crs] = await Promise.all([adminGetEnquiries(), adminGetCourses()]);
      setEnquiries(enq);
      setCourses(crs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleStatusChange = async (id: string, status: EnquiryStatus) => {
    await adminUpdateEnquiry(id, { status });
    await loadData();
    setToast({
      id: String(Date.now()),
      text: `Updated enquiry status to ${status}.`,
    });
  };

  const courseName = (id: string | null) =>
    courses.find((c) => c.id === id)?.name || 'General Academy Enquiry';

  const filtered = enquiries.filter((e) =>
    statusFilter === 'all' ? true : e.status === statusFilter
  );

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Academy enquiries"
        description="Follow up with prospective students who submitted the enquiry form on the Academy page."
        helpText="Update each student's status from New to Contacted, Enrolled, or Closed as your admissions coordinator speaks with them."
      />

      <Toolbar>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | EnquiryStatus)}
          aria-label="Filter enquiries by status"
          className="px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
        >
          <option value="all">All statuses ({enquiries.length})</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="enrolled">Enrolled</option>
          <option value="closed">Closed</option>
        </select>
      </Toolbar>

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState description="Student enquiries submitted on the /academy page will appear here." />
      ) : (
        <div className="space-y-3">
          {filtered.map((enq) => (
            <div
              key={enq.id}
              className="p-5 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[15px] text-[#15110F]">{enq.full_name}</span>
                  <StatusBadge variant={enq.status} />
                  <span className="text-[12px] text-[#6B6560] font-mono">
                    · {courseName(enq.course_id)}
                  </span>
                </div>
                <div className="text-[13px] text-[#6B6560]">
                  <span className="font-mono">{enq.phone}</span> · {enq.email}
                </div>
                {enq.message && (
                  <p className="text-[13px] text-[#15110F] pt-1">“{enq.message}”</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href={`tel:${enq.phone}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-[#E6E2DB] text-[12px] font-medium hover:bg-[#F6F4F0]"
                >
                  <Phone size={14} />
                  <span>Call</span>
                </a>
                <a
                  href={buildWhatsAppUrl(
                    `Hi ${enq.full_name}, thanks for enquiring about ${courseName(enq.course_id)} at Bbold Academy Mumbai.`,
                    enq.phone
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-[#E6E2DB] text-[12px] font-medium hover:bg-[#F6F4F0]"
                >
                  <MessageCircle size={14} className="text-[#1E7B4F]" />
                  <span>WhatsApp</span>
                </a>

                <select
                  value={enq.status}
                  onChange={(e) =>
                    void handleStatusChange(enq.id, e.target.value as EnquiryStatus)
                  }
                  aria-label="Change enquiry status"
                  className="px-2.5 py-1.5 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] text-[12px] font-medium"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

// =============================================================================
// 3. TESTIMONIALS ADMIN PAGE (/admin/testimonials)
// =============================================================================

export const AdminTestimonialsPage: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [serviceLabel, setServiceLabel] = useState('');
  const [quote, setQuote] = useState('');
  const [consent, setConsent] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isRealContent, setIsRealContent] = useState(true);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadTestimonials = useCallback(async () => {
    setLoading(true);
    try {
      setTestimonials(await adminGetTestimonials());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTestimonials();
  }, [loadTestimonials]);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setServiceLabel("Women's Haircut");
    setQuote('');
    setConsent(false);
    setIsActive(true);
    setIsRealContent(true);
    setConsentError(null);
    setDrawerOpen(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditingId(t.id);
    setName(t.name);
    setServiceLabel(t.service_label || '');
    setQuote(t.quote);
    setConsent(t.consent);
    setIsActive(t.is_active);
    setIsRealContent(true);
    setConsentError(null);
    setDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setConsentError(null);

    // Real (non-sample) testimonial cannot be active unless consent is true
    if (isRealContent && isActive && !consent) {
      setConsentError(
        'To publish a real client quote on the website, you must confirm that this person agreed to be quoted.'
      );
      return;
    }

    setSaving(true);
    try {
      await adminUpsertTestimonial({
        id: editingId || undefined,
        name: name.trim(),
        service_label: serviceLabel.trim() || null,
        quote: quote.trim(),
        consent,
        is_active: isActive,
        is_sample: !isRealContent,
      });
      setDrawerOpen(false);
      await loadTestimonials();
      setToast({
        id: String(Date.now()),
        text: 'Saved. This is now live on your website.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const backup = { ...deleteTarget };
    setDeleteTarget(null);
    await adminDeleteTestimonial(backup.id);
    await loadTestimonials();
    setToast({
      id: String(Date.now()),
      text: `Deleted testimonial from ${backup.name}.`,
      onUndo: () => {
        void adminUpsertTestimonial(backup).then(() => loadTestimonials());
      },
    });
  };

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Testimonials"
        description="Publish short, service-specific client quotes with verified consent."
        helpText="A real testimonial can only be published when 'This person agreed to be quoted' is checked."
        primaryActionLabel="Add testimonial"
        onPrimaryAction={openCreate}
      />

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : testimonials.length === 0 ? (
        <EmptyState
          description="Add your first client testimonial once a client agrees to be quoted."
          actionLabel="Add testimonial"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[15px]">{t.name}</span>
                    {t.is_sample && <StatusBadge variant="sample" />}
                    <StatusBadge variant={t.is_active ? 'published' : 'hidden'} />
                  </div>
                  <KebabMenu
                    actions={[
                      { label: 'Edit testimonial', onClick: () => openEdit(t) },
                      {
                        label: t.is_active ? 'Hide from website' : 'Publish on website',
                        onClick: () =>
                          void adminUpsertTestimonial({
                            ...t,
                            is_active: !t.is_active,
                          }).then(() => loadTestimonials()),
                      },
                      {
                        label: 'Delete testimonial',
                        danger: true,
                        onClick: () => setDeleteTarget(t),
                      },
                    ]}
                  />
                </div>
                <div className="font-mono text-[12px] text-[#6B6560]">
                  Service: {t.service_label || 'Salon visit'}
                </div>
                <p className="text-[14px] text-[#15110F]">“{t.quote}”</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        title={editingId ? 'Edit testimonial' : 'Add testimonial'}
        onClose={() => setDrawerOpen(false)}
        onSave={(e) => void handleSave(e)}
        isSaving={saving}
      >
        <FormField label="Client name (e.g. Meera K.)" required>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>

        <FormField label="Service received (e.g. Women's Haircut, Bridal Makeup)" required>
          <input
            type="text"
            required
            value={serviceLabel}
            onChange={(e) => setServiceLabel(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>

        <FormField label="Quote" required>
          <textarea
            rows={4}
            required
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>

        {/* Required Consent Checkbox */}
        <div className="p-3 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] space-y-1">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-[12px] font-medium text-[#15110F]">
              This person agreed to be quoted *
            </span>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="w-4 h-4 accent-[#C4262E]"
            />
          </label>
          {consentError && <p className="text-[12px] text-[#B3261E]">{consentError}</p>}
        </div>

        <label className="flex items-center justify-between p-3 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] cursor-pointer">
          <span className="text-[12px] font-medium">
            {isActive ? 'Published on website' : 'Hidden from website'}
          </span>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 accent-[#C4262E]"
          />
        </label>

        <RealContentToggle checked={isRealContent} onChange={setIsRealContent} />
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this testimonial?"
        description="You can undo this deletion for 10 seconds."
        confirmLabel="Delete"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

// =============================================================================
// 4. FAQ ADMIN PAGE (/admin/faq)
// =============================================================================

export const AdminFaqPage: React.FC = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('Booking');
  const [isActive, setIsActive] = useState(true);
  const [isRealContent, setIsRealContent] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadFaqs = useCallback(async () => {
    setLoading(true);
    try {
      setFaqs(await adminGetFaqs());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFaqs();
  }, [loadFaqs]);

  const openCreate = () => {
    setEditingId(null);
    setQuestion('');
    setAnswer('');
    setCategory('Booking');
    setIsActive(true);
    setIsRealContent(true);
    setDrawerOpen(true);
  };

  const openEdit = (f: FaqItem) => {
    setEditingId(f.id);
    setQuestion(f.question);
    setAnswer(f.answer);
    setCategory(f.category || 'General');
    setIsActive(f.is_active);
    setIsRealContent(true);
    setDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      await adminUpsertFaq({
        id: editingId || undefined,
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim() || 'General',
        is_active: isActive,
        is_sample: !isRealContent,
      });
      setDrawerOpen(false);
      await loadFaqs();
      setToast({
        id: String(Date.now()),
        text: 'Saved. This is now live on your website.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (f: FaqItem, dir: -1 | 1) => {
    const idx = faqs.findIndex((x) => x.id === f.id);
    const swap = faqs[idx + dir];
    if (!swap) return;
    await Promise.all([
      adminUpsertFaq({ ...f, sort_order: swap.sort_order }),
      adminUpsertFaq({ ...swap, sort_order: f.sort_order }),
    ]);
    await loadFaqs();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const backup = { ...deleteTarget };
    setDeleteTarget(null);
    await adminDeleteFaq(backup.id);
    await loadFaqs();
    setToast({
      id: String(Date.now()),
      text: 'Deleted FAQ entry.',
      onUndo: () => {
        void adminUpsertFaq(backup).then(() => loadFaqs());
      },
    });
  };

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="FAQ"
        description="Manage frequently asked questions about booking, pricing, bridal trials, and the Academy."
        helpText="Questions can be reordered with the up/down arrows and grouped by category tabs on the public FAQ page."
        primaryActionLabel="Add question"
        onPrimaryAction={openCreate}
      />

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : faqs.length === 0 ? (
        <EmptyState
          description="Add your first frequently asked question."
          actionLabel="Add question"
          onAction={openCreate}
        />
      ) : (
        <div className="rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] divide-y divide-[#E6E2DB]">
          {faqs.map((f, idx) => (
            <div
              key={f.id}
              className="p-4 flex items-start justify-between gap-4 hover:bg-[#F6F4F0]/40"
            >
              <div className="flex items-start gap-3 min-w-0">
                <ReorderButtons
                  disableUp={idx === 0}
                  disableDown={idx === faqs.length - 1}
                  onMoveUp={() => void handleMove(f, -1)}
                  onMoveDown={() => void handleMove(f, 1)}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[14px] text-[#15110F]">{f.question}</span>
                    {f.is_sample && <StatusBadge variant="sample" />}
                    <StatusBadge variant={f.is_active ? 'published' : 'hidden'} />
                  </div>
                  <p className="text-[13px] text-[#6B6560] mt-1">{f.answer}</p>
                </div>
              </div>

              <KebabMenu
                actions={[
                  { label: 'Edit question', onClick: () => openEdit(f) },
                  {
                    label: f.is_active ? 'Hide from website' : 'Publish on website',
                    onClick: () =>
                      void adminUpsertFaq({ ...f, is_active: !f.is_active }).then(() =>
                        loadFaqs()
                      ),
                  },
                  {
                    label: 'Delete question',
                    danger: true,
                    onClick: () => setDeleteTarget(f),
                  },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        title={editingId ? 'Edit question' : 'Add question'}
        onClose={() => setDrawerOpen(false)}
        onSave={(e) => void handleSave(e)}
        isSaving={saving}
      >
        <FormField label="Category (e.g. Booking, Services, Bridal, Academy, General)">
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>

        <FormField label="Question" required>
          <input
            type="text"
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>

        <FormField label="Answer" required>
          <textarea
            rows={4}
            required
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
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
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 accent-[#C4262E]"
          />
        </label>

        <RealContentToggle checked={isRealContent} onChange={setIsRealContent} />
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this question?"
        description="You can undo this deletion for 10 seconds."
        confirmLabel="Delete"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};
