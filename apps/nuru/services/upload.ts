// apps/nuru/services/upload.ts
// Normalizes a picked asset for upload. iPhone photos are HEIC/HEIF by default,
// which the server's OCR cannot read — convert those to JPEG on-device so the
// server only ever sees formats it can extract. Non-HEIC assets (incl. PDFs) pass
// through untouched.
import * as ImageManipulator from 'expo-image-manipulator';

export type PickedAsset = { uri: string; name?: string | null; mimeType?: string | null };
export type UploadFile = { uri: string; name: string; type: string };

function isHeic(a: PickedAsset): boolean {
  return /heic|heif/i.test(a.mimeType ?? '') || /\.hei[cf]$/i.test(a.name ?? '');
}

function renameToJpg(name: string): string {
  return name.replace(/\.[^.]+$/, '') + '.jpg';
}

export async function toUploadable(asset: PickedAsset): Promise<UploadFile> {
  const name = asset.name ?? `upload-${Date.now()}`;
  if (!isHeic(asset)) {
    return { uri: asset.uri, name, type: asset.mimeType ?? 'application/octet-stream' };
  }
  const out = await ImageManipulator.manipulateAsync(asset.uri, [], {
    format: ImageManipulator.SaveFormat.JPEG,
    compress: 0.85,
  });
  return { uri: out.uri, name: renameToJpg(name), type: 'image/jpeg' };
}
