const DATABASE_NAME = "ai-chart-analyst";
const STORE_NAME = "analysis-assets";
const LATEST_IMAGE_KEY = "latest-chart-image";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("无法打开本地图片存储。"));
  });
}

export async function saveAnalysisImage(image: File): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(image, LATEST_IMAGE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("无法保存图片。"));
    transaction.onabort = () => reject(transaction.error ?? new Error("无法保存图片。"));
  });
  database.close();
}

export async function loadAnalysisImage(): Promise<File | null> {
  const database = await openDatabase();
  const image = await new Promise<File | null>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(LATEST_IMAGE_KEY);
    request.onsuccess = () => resolve(request.result instanceof File ? request.result : null);
    request.onerror = () => reject(request.error ?? new Error("无法读取图片。"));
  });
  database.close();
  return image;
}
