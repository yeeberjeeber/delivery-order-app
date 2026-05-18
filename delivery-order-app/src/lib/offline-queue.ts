const DB_NAME    = "do-tracker-offline"
const STORE_NAME = "pending-submissions"
const DB_VERSION = 1

export interface QueuedSubmission {
  id: string
  queuedAt: string
  payload: Record<string, unknown>
  photoBase64?: string  // stored when Cloudinary upload failed offline
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id" })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror  = () => reject(req.error)
  })
}

export async function enqueue(
  item: Omit<QueuedSubmission, "id" | "queuedAt">
): Promise<string> {
  const db  = await openDB()
  const id  = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const rec: QueuedSubmission = { ...item, id, queuedAt: new Date().toISOString() }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).add(rec)
    tx.oncomplete = () => resolve(id)
    tx.onerror    = () => reject(tx.error)
  })
}

export async function getAllQueued(): Promise<QueuedSubmission[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readonly")
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result as QueuedSubmission[])
    req.onerror   = () => reject(req.error)
  })
}

export async function dequeue(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

export async function getQueueCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readonly")
    const req = tx.objectStore(STORE_NAME).count()
    req.onsuccess = () => resolve(req.result as number)
    req.onerror   = () => reject(req.error)
  })
}