/* persist-store.jsx — IndexedDB 자동 저장 (글·그림·표지 영구 보존)
   localStorage는 용량(약 5MB)이 작아 이미지 보관 불가 → IndexedDB 사용.
   window.ArtbookStore.get(key) / .set(key, value) (Promise)
*/
(function () {
  const DB = "artbook_db";
  const STORE = "kv";
  const VER = 1;

  function open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, VER);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }

  async function set(key, value) {
    try {
      const db = await open();
      await new Promise((res, rej) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = res;
        tx.onerror = () => rej(tx.error);
        tx.onabort = () => rej(tx.error);
      });
      db.close();
      return true;
    } catch (e) {
      console.warn("[ArtbookStore] 저장 실패:", e && e.message);
      return false;
    }
  }

  async function get(key) {
    try {
      const db = await open();
      const v = await new Promise((res, rej) => {
        const tx = db.transaction(STORE, "readonly");
        const rq = tx.objectStore(STORE).get(key);
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      });
      db.close();
      return v;
    } catch (e) {
      console.warn("[ArtbookStore] 로드 실패:", e && e.message);
      return undefined;
    }
  }

  window.ArtbookStore = { get, set };
})();
