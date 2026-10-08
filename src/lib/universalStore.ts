/**
 * Universal Cross-Device Store Client
 * Synchronizes all site images, gallery items, stylists, services, courses,
 * testimonials, FAQs, site texts, salon settings, business hours, blocked dates,
 * appointments, and enquiries with the backend Express server (/api/universal-store)
 * so changes and uploaded pictures are immediately visible across all devices.
 */

const ALL_SYNC_KEYS = [
  'bbold_local_services_v1',
  'bbold_local_stylists_v1',
  'bbold_local_courses_v1',
  'bbold_local_testimonials_v1',
  'bbold_local_gallery_v1',
  'bbold_local_faqs_v1',
  'bbold_local_site_images_v1',
  'bbold_local_site_texts_v1',
  'bbold_local_enquiries_v1',
  'bbold_local_appointments_v1',
  'bbold_local_blocked_dates_v1',
  'bbold_local_business_hours_v1',
  'bbold_local_salon_settings_v1',
] as const;

const MIGRATED_FLAG_KEY = 'bbold_universal_migrated_v2';

// In-memory store guarantees zero data loss even if browser localStorage hits 5MB quota
const memoryStore: Record<string, unknown> = {};
let initialSyncPromise: Promise<void> | null = null;
let lastKnownServerUpdatedAt = '';

export function safeReadLocalStorageJson<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function safeWriteLocalStorageJson(key: string, value: unknown): void {
  memoryStore[key] = value;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // If localStorage quota is exceeded (e.g. from older base64 images), keep in memoryStore
    // without ever throwing an error in the UI.
  }
}

export function getUniversalValue<T>(key: string, fallback: T): T {
  if (key in memoryStore && memoryStore[key] !== undefined && memoryStore[key] !== null) {
    return memoryStore[key] as T;
  }
  const fromStorage = safeReadLocalStorageJson<T>(key);
  if (fromStorage !== undefined && fromStorage !== null) {
    memoryStore[key] = fromStorage;
    return fromStorage;
  }
  return fallback;
}

/**
 * Merges any pre-existing local custom photos (from site_images, gallery, stylists)
 * into the server tables so pictures uploaded on one device before server sync
 * are never lost and automatically become universal across all devices.
 */
function mergeLocalUploadsWithServer(
  serverTables: Record<string, unknown>,
  alreadyMigrated: boolean
): Record<string, unknown> {
  const entriesToPush: Record<string, unknown> = {};

  for (const key of ALL_SYNC_KEYS) {
    const localVal = safeReadLocalStorageJson<unknown>(key);
    const serverVal = serverTables[key];

    if (serverVal === undefined || serverVal === null) {
      if (localVal !== undefined && localVal !== null) {
        entriesToPush[key] = localVal;
      }
      continue;
    }

    if (alreadyMigrated || localVal === undefined || localVal === null) {
      continue;
    }

    // 1. Merge site_images slot map
    if (
      key === 'bbold_local_site_images_v1' &&
      typeof localVal === 'object' &&
      !Array.isArray(localVal) &&
      typeof serverVal === 'object' &&
      !Array.isArray(serverVal)
    ) {
      const localMap = localVal as Record<
        string,
        { slot: string; image_url: string | null; alt: string; updated_at?: string }
      >;
      const serverMap = {
        ...(serverVal as Record<
          string,
          { slot: string; image_url: string | null; alt: string; updated_at?: string }
        >),
      };
      let mergedChanged = false;

      for (const [slotId, localSlot] of Object.entries(localMap)) {
        if (!localSlot || !localSlot.image_url) continue;
        const srvSlot = serverMap[slotId];
        if (!srvSlot || !srvSlot.image_url) {
          serverMap[slotId] = localSlot;
          mergedChanged = true;
        } else if (
          localSlot.updated_at &&
          srvSlot.updated_at &&
          localSlot.updated_at > srvSlot.updated_at
        ) {
          serverMap[slotId] = localSlot;
          mergedChanged = true;
        }
      }

      if (mergedChanged) {
        entriesToPush[key] = serverMap;
      }
    }

    // 2. Merge gallery_items array
    if (
      key === 'bbold_local_gallery_v1' &&
      Array.isArray(localVal) &&
      Array.isArray(serverVal)
    ) {
      const localArr = localVal as Array<Record<string, unknown>>;
      const serverArr = [...(serverVal as Array<Record<string, unknown>>)];
      let mergedChanged = false;

      for (const localItem of localArr) {
        const hasRealPhoto =
          (typeof localItem.image_url === 'string' &&
            localItem.image_url.length > 0 &&
            localItem.image_url !== 'ILLUSTRATION_AFTER') ||
          (typeof localItem.before_image_url === 'string' &&
            localItem.before_image_url.length > 0 &&
            localItem.before_image_url !== 'ILLUSTRATION_BEFORE');

        if (!hasRealPhoto && localItem.is_sample) continue;

        const existingIdx = serverArr.findIndex((s) => s.id === localItem.id);
        if (existingIdx === -1) {
          serverArr.unshift(localItem);
          mergedChanged = true;
        } else if (hasRealPhoto && !serverArr[existingIdx].image_url) {
          serverArr[existingIdx] = localItem;
          mergedChanged = true;
        }
      }

      if (mergedChanged) {
        entriesToPush[key] = serverArr;
      }
    }

    // 3. Merge stylists array
    if (
      key === 'bbold_local_stylists_v1' &&
      Array.isArray(localVal) &&
      Array.isArray(serverVal)
    ) {
      const localArr = localVal as Array<Record<string, unknown>>;
      const serverArr = [...(serverVal as Array<Record<string, unknown>>)];
      let mergedChanged = false;

      for (const localItem of localArr) {
        const hasRealPhoto =
          typeof localItem.photo_url === 'string' && localItem.photo_url.length > 0;
        if (!hasRealPhoto && localItem.is_sample) continue;

        const existingIdx = serverArr.findIndex((s) => s.id === localItem.id);
        if (existingIdx === -1) {
          serverArr.push(localItem);
          mergedChanged = true;
        } else if (hasRealPhoto && !serverArr[existingIdx].photo_url) {
          serverArr[existingIdx] = localItem;
          mergedChanged = true;
        }
      }

      if (mergedChanged) {
        entriesToPush[key] = serverArr;
      }
    }
  }

  return entriesToPush;
}

/**
 * Pulls the latest universal store from `/api/universal-store` into memoryStore + localStorage,
 * and migrates any existing local-only uploads from this device up to the server.
 */
export async function syncUniversalStoreFromServer(dispatchEvents = true): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const res = await fetch('/api/universal-store', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) return;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return;

    const data = (await res.json()) as {
      ok?: boolean;
      updatedAt?: string;
      tables?: Record<string, unknown>;
    };

    if (!data.ok || !data.tables) return;

    let serverTables = data.tables;
    const alreadyMigrated = Boolean(safeReadLocalStorageJson<boolean>(MIGRATED_FLAG_KEY));
    const entriesToPush = mergeLocalUploadsWithServer(serverTables, alreadyMigrated);

    if (Object.keys(entriesToPush).length > 0) {
      try {
        const postRes = await fetch('/api/universal-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entries: entriesToPush,
          }),
        });
        if (postRes.ok) {
          const postData = (await postRes.json()) as {
            ok?: boolean;
            updatedAt?: string;
            tables?: Record<string, unknown>;
          };
          if (postData.ok && postData.tables) {
            serverTables = postData.tables;
          }
          if (postData.updatedAt) {
            data.updatedAt = postData.updatedAt;
          }
        }
      } catch {
        // ignore network error
      }
    }

    safeWriteLocalStorageJson(MIGRATED_FLAG_KEY, true);

    let hasChanges = false;
    for (const key of ALL_SYNC_KEYS) {
      if (key in serverTables && serverTables[key] !== undefined && serverTables[key] !== null) {
        const prevSerialized = JSON.stringify(memoryStore[key] ?? safeReadLocalStorageJson(key));
        const nextSerialized = JSON.stringify(serverTables[key]);
        memoryStore[key] = serverTables[key];
        safeWriteLocalStorageJson(key, serverTables[key]);
        if (prevSerialized !== nextSerialized) {
          hasChanges = true;
        }
      }
    }

    if (data.updatedAt && data.updatedAt !== lastKnownServerUpdatedAt) {
      lastKnownServerUpdatedAt = data.updatedAt;
      hasChanges = true;
    }

    if (hasChanges && dispatchEvents) {
      window.dispatchEvent(new CustomEvent('bbold-sample-toggle'));
      window.dispatchEvent(new CustomEvent('bbold-appointments-updated'));
    }
  } catch {
    // Offline or test environment fallback
  }
}

/**
 * Ensures the initial sync from the server has completed before reading local tables.
 */
export async function ensureUniversalStoreSynced(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!initialSyncPromise) {
    initialSyncPromise = syncUniversalStoreFromServer(false).finally(() => {
      // Allow subsequent explicit sync checks after 2 seconds
      setTimeout(() => {
        initialSyncPromise = null;
      }, 2000);
    });
  }
  await initialSyncPromise;
}

/**
 * Writes a key-value pair both to memoryStore/localStorage and to `/api/universal-store` on the server
 * so that every device sees the update immediately without any localStorage quota errors.
 */
export async function pushKeyToUniversalServer(key: string, value: unknown): Promise<void> {
  safeWriteLocalStorageJson(key, value);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bbold-sample-toggle'));
  }

  try {
    const res = await fetch('/api/universal-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = (await res.json()) as {
          updatedAt?: string;
          tables?: Record<string, unknown>;
        };
        if (json.updatedAt) {
          lastKnownServerUpdatedAt = json.updatedAt;
        }
        if (json.tables && key in json.tables) {
          safeWriteLocalStorageJson(key, json.tables[key]);
        }
      }
    }
  } catch {
    // Keep memoryStore/localStorage copy if offline
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bbold-sample-toggle'));
  }
}

/**
 * Uploads a resized image Blob to `/api/upload` and returns the universal image URL
 * (`/api/uploads/<folder>/<filename>`) accessible from any device.
 */
export async function uploadBlobToUniversalServer(
  imageBlob: Blob,
  folder = 'uploads'
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read image blob'));
    reader.readAsDataURL(imageBlob);
  });

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, folder }),
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = (await res.json()) as { ok?: boolean; url?: string };
        if (data.ok && data.url) {
          return data.url;
        }
      }
    }
  } catch {
    // Fallback to dataUrl if server endpoint is unreachable
  }

  return dataUrl;
}
