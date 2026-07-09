/**
 * Simple IndexedDB wrapper for saving/loading custom levels.
 * Falls back to localStorage if IndexedDB is unavailable.
 */

const DB_NAME = 'TankWorldWar';
const STORE_NAME = 'customLevels';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomLevel(levelData) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(levelData);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    // Fallback to localStorage
    const levels = loadCustomLevelsSync();
    const existing = levels.findIndex(l => l.id === levelData.id);
    if (existing >= 0) {
      levels[existing] = levelData;
    } else {
      levels.push(levelData);
    }
    localStorage.setItem('tww_custom_levels', JSON.stringify(levels));
    return true;
  }
}

function loadCustomLevelsSync() {
  try {
    const data = localStorage.getItem('tww_custom_levels');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function loadCustomLevels() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const levels = request.result || [];
        // Also merge from localStorage
        const localLevels = loadCustomLevelsSync();
        const ids = new Set(levels.map(l => l.id));
        localLevels.forEach(l => {
          if (!ids.has(l.id)) levels.push(l);
        });
        resolve(levels);
      };
      request.onerror = () => resolve(loadCustomLevelsSync());
    });
  } catch (e) {
    return loadCustomLevelsSync();
  }
}

export async function deleteCustomLevel(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise(resolve => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    const levels = loadCustomLevelsSync().filter(l => l.id !== id);
    localStorage.setItem('tww_custom_levels', JSON.stringify(levels));
    return true;
  }
}
