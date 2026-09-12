/**
 * StorageManager: IndexedDB wrapper for high-capacity audio & metadata storage
 * Clean, production-ready, no hardcoded demo drafts.
 */
class StorageManager {
  constructor() {
    this.dbName = 'AI_Voice_Recorder_DB';
    this.version = 2; // Incremented to clean old mock drafts
    this.storeName = 'recordings';
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = async (e) => {
        this.db = e.target.result;
        // Purge any old hardcoded demo drafts from version 1
        await this.purgeOldDemoDrafts();
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error('IndexedDB open error:', e);
        reject(e);
      };
    });
  }

  async purgeOldDemoDrafts() {
    try {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.delete('demo-meeting-1');
    } catch (err) {
      // Ignore if not present
    }
  }

  async saveRecording(recording) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.put(recording);

      req.onsuccess = () => resolve(recording.id);
      req.onerror = (err) => reject(err);
    });
  }

  async getAllRecordings() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = (req.result || []).filter(item => item.id !== 'demo-meeting-1');
        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        resolve(items);
      };
      req.onerror = (err) => reject(err);
    });
  }

  async getRecording(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result);
      req.onerror = (err) => reject(err);
    });
  }

  async deleteRecording(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = (err) => reject(err);
    });
  }
}
