import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getPublicSiteImages,
  getPublicSiteTexts,
  getPublicSalonSettings,
  getPublicBusinessHours,
  isSampleContentEnabled,
} from '../lib/content';
import { syncUniversalStoreFromServer } from '../lib/universalStore';
import {
  DEFAULT_SALON_SETTINGS,
  DEFAULT_BUSINESS_HOURS,
  DEFAULT_SITE_TEXTS,
} from '../config/site';
import type {
  SiteImageRow,
  SiteTextsMap,
  SalonSettings,
  BusinessHour,
} from '../types/database';

interface SiteDataContextValue {
  siteImages: Record<string, SiteImageRow>;
  siteTexts: SiteTextsMap;
  salonSettings: SalonSettings;
  businessHours: BusinessHour[];
  sampleEnabled: boolean;
  isLoading: boolean;
  refreshSiteData: () => Promise<void>;
}

const SiteDataContext = createContext<SiteDataContextValue>({
  siteImages: {},
  siteTexts: DEFAULT_SITE_TEXTS,
  salonSettings: DEFAULT_SALON_SETTINGS,
  businessHours: DEFAULT_BUSINESS_HOURS,
  sampleEnabled: isSampleContentEnabled(),
  isLoading: true,
  refreshSiteData: async () => {},
});

export const SiteDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [siteImages, setSiteImages] = useState<Record<string, SiteImageRow>>({});
  const [siteTexts, setSiteTexts] = useState<SiteTextsMap>(DEFAULT_SITE_TEXTS);
  const [salonSettings, setSalonSettings] = useState<SalonSettings>(DEFAULT_SALON_SETTINGS);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(DEFAULT_BUSINESS_HOURS);
  const [sampleEnabled, setSampleEnabled] = useState<boolean>(isSampleContentEnabled());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSiteData = useCallback(async () => {
    setSampleEnabled(isSampleContentEnabled());
    try {
      await syncUniversalStoreFromServer(false);
      const [imgs, texts, settings, hours] = await Promise.all([
        getPublicSiteImages(),
        getPublicSiteTexts(),
        getPublicSalonSettings(),
        getPublicBusinessHours(),
      ]);
      setSiteImages(imgs);
      setSiteTexts(texts);
      setSalonSettings(settings);
      setBusinessHours(hours);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSiteData();
    const handleSampleToggle = () => {
      setSampleEnabled(isSampleContentEnabled());
      void refreshSiteData();
    };
    const handleWindowFocus = () => {
      void syncUniversalStoreFromServer(true);
    };
    const pollInterval = window.setInterval(() => {
      void syncUniversalStoreFromServer(true);
    }, 6000);

    window.addEventListener('bbold-sample-toggle', handleSampleToggle);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('bbold-sample-toggle', handleSampleToggle);
      window.removeEventListener('focus', handleWindowFocus);
      window.clearInterval(pollInterval);
    };
  }, [refreshSiteData]);

  return (
    <SiteDataContext.Provider
      value={{
        siteImages,
        siteTexts,
        salonSettings,
        businessHours,
        sampleEnabled,
        isLoading,
        refreshSiteData,
      }}
    >
      {children}
    </SiteDataContext.Provider>
  );
};

export function useSiteData(): SiteDataContextValue {
  return useContext(SiteDataContext);
}
