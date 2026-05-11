// Client-side only — uses Canvas API

const MAX_PX = 1920
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Canvas toBlob failed"))), "image/jpeg", quality)
  )
}

export async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_PX / Math.max(bitmap.width, bitmap.height))

  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  let quality = 0.85
  let blob = await canvasToBlob(canvas, quality)

  while (blob.size > MAX_BYTES && quality > 0.3) {
    quality = Math.max(0.3, quality - 0.15)
    blob = await canvasToBlob(canvas, quality)
  }

  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" })
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}
