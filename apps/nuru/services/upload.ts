// apps/nuru/services/upload.ts
// Normalizes a picked asset for upload. Currently a pass-through: the asset's
// uri/name/type are forwarded to the server as-is.
//
// HEIC/HEIF note: iPhone photos default to HEIC, which the server's OCR cannot
// read — the notes route rejects those types with a clear 422. On-device
// HEIC→JPEG conversion (via expo-image-manipulator) was removed because it is a
// native module that requires a dev-client rebuild, and iPhone is not a near-term
// target. When iPhone ships, reinstate the conversion here (see git history for
// commit db49e26) behind an isHeic() check; the interface below stays the same.
export type PickedAsset = { uri: string; name?: string | null; mimeType?: string | null };
export type UploadFile = { uri: string; name: string; type: string };

export async function toUploadable(asset: PickedAsset): Promise<UploadFile> {
  const name = asset.name ?? `upload-${Date.now()}`;
  return { uri: asset.uri, name, type: asset.mimeType ?? 'application/octet-stream' };
}
