import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Input, Progress, Tag } from 'antd';
import { useRef, useState } from 'react';
import { uploadApi } from '@/services/api';
import { ApiError } from '@/services/apiClient';
import type { MediaAsset } from '@/types/api';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;
export const MAX_MEDIA = 10;

interface Props {
  sku: string;
  value: MediaAsset[];
  onChange: (next: MediaAsset[]) => void;
  disabled?: boolean;
}

interface CloudinaryResult { public_id: string; width: number; height: number; duration?: number; format?: string; secure_url: string }

/** Signed, direct-to-Cloudinary upload with progress. The API only hands out a short-lived signature. */
function uploadToCloudinary(file: File, upload: Record<string, unknown>, onProgress: (percent: number) => void): Promise<CloudinaryResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', String(upload.apiKey));
    form.append('timestamp', String(upload.timestamp));
    form.append('signature', String(upload.signature));
    form.append('folder', String(upload.folder));
    form.append('allowed_formats', String(upload.allowed_formats));
    const request = new XMLHttpRequest();
    request.open('POST', String(upload.uploadUrl));
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    request.onerror = () => reject(new Error('The upload could not reach Cloudinary. Check your connection.'));
    request.onload = () => {
      try {
        const json = JSON.parse(request.responseText);
        if (request.status >= 200 && request.status < 300) resolve(json as CloudinaryResult);
        else reject(new Error(json?.error?.message ?? 'Cloudinary rejected the file.'));
      } catch {
        reject(new Error('Cloudinary sent an unreadable answer.'));
      }
    };
    request.send(form);
  });
}

export function MediaManager({ sku, value, onChange, disabled }: Props) {
  const { message } = App.useApp();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ name: string; percent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const skuReady = sku.trim().length > 0;

  async function handleFile(file: File) {
    setError(null);
    const isImage = IMAGE_TYPES.includes(file.type);
    const isVideo = VIDEO_TYPES.includes(file.type);
    if (!isImage && !isVideo) return setError('Use a JPG, PNG, WebP or AVIF photo, or an MP4, MOV or WebM film.');
    if (file.size > (isVideo ? MAX_VIDEO : MAX_IMAGE)) return setError(`That file is too large (limit ${isVideo ? '100' : '10'} MB).`);
    if (value.length >= MAX_MEDIA) return setError(`A product can have at most ${MAX_MEDIA} photos and films.`);
    setProgress({ name: file.name, percent: 0 });
    try {
      const { upload } = await uploadApi.sign(sku.trim(), isVideo ? 'video' : 'image');
      const result = await uploadToCloudinary(file, upload, (percent) => setProgress({ name: file.name, percent }));
      onChange([...value, {
        publicId: result.public_id,
        resourceType: isVideo ? 'video' : 'image',
        width: result.width,
        height: result.height,
        ...(isVideo && result.duration ? { duration: result.duration } : {}),
        ...(result.format ? { format: result.format } : {}),
        alt: '',
        url: result.secure_url,
      }]);
      message.success('Uploaded. Save the product to keep it.');
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 503 ? 'Image storage (Cloudinary) is not configured on the server.' : caught instanceof Error ? caught.message : 'Upload failed.');
    } finally {
      setProgress(null);
      if (input.current) input.current.value = '';
    }
  }

  const move = (index: number, by: -1 | 1) => {
    const next = [...value];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    onChange(next);
  };

  return (
    <div>
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} role="alert" closable onClose={() => setError(null)} /> : null}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
        {value.map((asset, index) => (
          <li key={asset.publicId} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 160px) 1fr auto', gap: 12, alignItems: 'start', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
            <div style={{ background: 'var(--stone)', borderRadius: 6, display: 'grid', placeItems: 'center', minHeight: 100, padding: 4 }}>
              {asset.resourceType === 'video'
                ? (asset.url ? <video src={asset.url} controls preload="metadata" style={{ maxWidth: '100%', maxHeight: 140 }} /> : <Tag>Film</Tag>)
                : <img src={asset.url} alt={asset.alt || `Photo ${index + 1}`} style={{ maxWidth: '100%', maxHeight: 140, width: 'auto', height: 'auto', objectFit: 'contain' }} />}
            </div>
            <div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                {index === 0 ? <Tag color="blue">Main</Tag> : null}{asset.resourceType === 'video' ? 'Film' : 'Photo'} · {asset.width}×{asset.height}px
              </div>
              <Input aria-label={`Alt text for media ${index + 1}`} placeholder="Describe what the photo shows (alt text)" maxLength={200} value={asset.alt} disabled={disabled}
                onChange={(event) => onChange(value.map((item, i) => (i === index ? { ...item, alt: event.target.value } : item)))} />
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              <Button size="small" icon={<ArrowUpOutlined />} aria-label="Move earlier" disabled={disabled || index === 0} onClick={() => move(index, -1)} />
              <Button size="small" icon={<ArrowDownOutlined />} aria-label="Move later" disabled={disabled || index === value.length - 1} onClick={() => move(index, 1)} />
              <Button size="small" danger icon={<DeleteOutlined />} aria-label="Remove from product" disabled={disabled} onClick={() => onChange(value.filter((_, i) => i !== index))} />
            </div>
          </li>
        ))}
      </ul>
      {value.length === 0 ? <p className="muted">No photos or films yet.</p> : null}
      {progress ? <div style={{ marginTop: 12 }}><div className="muted">{progress.name}</div><Progress percent={progress.percent} size="small" /></div> : null}
      <input ref={input} type="file" hidden accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(',')} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} />
      <Button style={{ marginTop: 12 }} icon={<UploadOutlined />} disabled={disabled || !skuReady || progress !== null || value.length >= MAX_MEDIA} onClick={() => input.current?.click()}>Add photo or film</Button>
      {!skuReady ? <span className="muted" style={{ marginLeft: 12 }}>Enter the SKU first: media is stored under it.</span> : null}
      <p className="muted" style={{ fontSize: 13 }}>Photos show at their real size and are never enlarged. Removing an item detaches it from this product; the file stays in Cloudinary.</p>
    </div>
  );
}
