/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicShell } from './components/public/PublicShell';

// Lazy-loaded Public Pages
const HomePage = lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage }))
);
const ServicesPage = lazy(() =>
  import('./pages/ServicesPage').then((m) => ({ default: m.ServicesPage }))
);
const TeamPage = lazy(() =>
  import('./pages/TeamPages').then((m) => ({ default: m.TeamPage }))
);
const StylistDetailPage = lazy(() =>
  import('./pages/TeamPages').then((m) => ({ default: m.StylistDetailPage }))
);
const BridalPage = lazy(() =>
  import('./pages/BridalPage').then((m) => ({ default: m.BridalPage }))
);
const AcademyPage = lazy(() =>
  import('./pages/AcademyPage').then((m) => ({ default: m.AcademyPage }))
);
const GalleryPage = lazy(() =>
  import('./pages/GalleryPage').then((m) => ({ default: m.GalleryPage }))
);
const TestimonialsPage = lazy(() =>
  import('./pages/OtherPublicPages').then((m) => ({ default: m.TestimonialsPage }))
);
const AboutPage = lazy(() =>
  import('./pages/OtherPublicPages').then((m) => ({ default: m.AboutPage }))
);
const ContactPage = lazy(() =>
  import('./pages/OtherPublicPages').then((m) => ({ default: m.ContactPage }))
);
const FaqPage = lazy(() =>
  import('./pages/OtherPublicPages').then((m) => ({ default: m.FaqPage }))
);
const LegalPage = lazy(() =>
  import('./pages/OtherPublicPages').then((m) => ({ default: m.LegalPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/OtherPublicPages').then((m) => ({ default: m.NotFoundPage }))
);

// Lazy-loaded Booking Wizard
const BookPage = lazy(() =>
  import('./pages/BookPage').then((m) => ({ default: m.BookPage }))
);

// Lazy-loaded Admin Shell & Pages
const AdminLoginPage = lazy(() =>
  import('./pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage }))
);
const AdminShell = lazy(() =>
  import('./components/admin/AdminShell').then((m) => ({ default: m.AdminShell }))
);
const AdminOverviewPage = lazy(() =>
  import('./pages/admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage }))
);
const AdminAppointmentsPage = lazy(() =>
  import('./pages/admin/AdminAppointmentsPage').then((m) => ({
    default: m.AdminAppointmentsPage,
  }))
);
const AdminServicesPage = lazy(() =>
  import('./pages/admin/AdminServicesPage').then((m) => ({ default: m.AdminServicesPage }))
);
const AdminStylistsPage = lazy(() =>
  import('./pages/admin/AdminStylistsPage').then((m) => ({ default: m.AdminStylistsPage }))
);
const AdminCoursesPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({ default: m.AdminCoursesPage }))
);
const AdminEnquiriesPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({ default: m.AdminEnquiriesPage }))
);
const AdminTestimonialsPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({
    default: m.AdminTestimonialsPage,
  }))
);
const AdminFaqPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({ default: m.AdminFaqPage }))
);
const AdminPhotosGalleryPage = lazy(() =>
  import('./pages/admin/AdminMediaAndToolsPages').then((m) => ({
    default: m.AdminPhotosGalleryPage,
  }))
);
const AdminHomepageStationsPage = lazy(() =>
  import('./pages/admin/AdminMediaAndToolsPages').then((m) => ({
    default: m.AdminHomepageStationsPage,
  }))
);
const AdminRealTransformationsPage = lazy(() =>
  import('./pages/admin/AdminMediaAndToolsPages').then((m) => ({
    default: m.AdminRealTransformationsPage,
  }))
);
const AdminHomepageTextPage = lazy(() =>
  import('./pages/admin/AdminMediaAndToolsPages').then((m) => ({
    default: m.AdminHomepageTextPage,
  }))
);
const AdminDataToolsPage = lazy(() =>
  import('./pages/admin/AdminMediaAndToolsPages').then((m) => ({
    default: m.AdminDataToolsPage,
  }))
);
const AdminBusinessHoursPage = lazy(() =>
  import('./pages/admin/AdminSiteSettingsPages').then((m) => ({
    default: m.AdminBusinessHoursPage,
  }))
);
const AdminBlockedDatesPage = lazy(() =>
  import('./pages/admin/AdminSiteSettingsPages').then((m) => ({
    default: m.AdminBlockedDatesPage,
  }))
);
const AdminSalonSettingsPage = lazy(() =>
  import('./pages/admin/AdminSiteSettingsPages').then((m) => ({
    default: m.AdminSalonSettingsPage,
  }))
);

export default function App() {
  return (
    <>
      <Suspense
        fallback={
          <div className="min-h-screen bg-transparent text-[#15110F] flex items-center justify-center font-mono text-xs uppercase tracking-widest">
            Loading Bbold Salon &amp; Academy...
          </div>
        }
      >
        <Routes>
          {/* Standalone Booking Wizard */}
          <Route path="/book" element={<BookPage />} />

          {/* Admin Auth & Protected Dashboard */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="appointments" element={<AdminAppointmentsPage />} />
            <Route path="services" element={<AdminServicesPage />} />
            <Route path="stylists" element={<AdminStylistsPage />} />
            <Route path="courses" element={<AdminCoursesPage />} />
            <Route path="enquiries" element={<AdminEnquiriesPage />} />
            <Route path="stations" element={<AdminHomepageStationsPage />} />
            <Route path="transformations" element={<AdminRealTransformationsPage />} />
            <Route path="photos" element={<AdminPhotosGalleryPage />} />
            <Route path="testimonials" element={<AdminTestimonialsPage />} />
            <Route path="faq" element={<AdminFaqPage />} />
            <Route path="hours" element={<AdminBusinessHoursPage />} />
            <Route path="blocked-dates" element={<AdminBlockedDatesPage />} />
            <Route path="homepage-text" element={<AdminHomepageTextPage />} />
            <Route path="settings" element={<AdminSalonSettingsPage />} />
            <Route path="data-tools" element={<AdminDataToolsPage />} />
          </Route>

          {/* Public Editorial Pages wrapped in PublicShell */}
          <Route element={<PublicShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/team/:id" element={<StylistDetailPage />} />
            <Route path="/bridal" element={<BridalPage />} />
            <Route path="/academy" element={<AcademyPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/testimonials" element={<TestimonialsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/privacy" element={<LegalPage mode="privacy" />} />
            <Route path="/terms" element={<LegalPage mode="terms" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
