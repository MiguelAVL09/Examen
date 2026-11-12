import { Capacitor, registerPlugin } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';
import { Share } from '@capacitor/share';

const publicSite = 'https://examen-smoky-mu.vercel.app';
const NativeActions = registerPlugin<{
  saveDocument(options: { name: string; mime: string; data: string }): Promise<{ saved: boolean }>;
  openLink(options: { url: string }): Promise<void>;
}>('NativeActions');

export const isAndroidApp = Capacitor.getPlatform() === 'android';
export const canShareLink = isAndroidApp || (typeof navigator !== 'undefined' && typeof navigator.share === 'function');

export function activityLink(kind: 'quiz' | 'verify', id: string) {
  const url = new URL(kind === 'quiz' ? '/app/actividad' : '/app/resultado', publicSite);
  url.searchParams.set(kind, id);
  return url.href;
}

export function appLinkQuery(address: string) {
  const url = new URL(address);
  if (url.origin !== publicSite) return '';
  const key = url.pathname === '/app/actividad' ? 'quiz' : url.pathname === '/app/resultado' ? 'verify' : null;
  const value = key && url.searchParams.get(key);
  return key && value ? `?${new URLSearchParams({ [key]: value })}` : '';
}

export async function copyLink(url: string) {
  if (isAndroidApp) await Clipboard.write({ string: url });
  else await navigator.clipboard.writeText(url);
}

export async function shareLink(options: { title: string; text: string; url: string }) {
  if (isAndroidApp) await Share.share(options);
  else await navigator.share(options);
}

export async function openExternalLink(url: string) {
  if (!isAndroidApp) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }
  try {
    await NativeActions.openLink({ url });
    return true;
  } catch {
    window.alert('No hay una aplicación disponible para abrir este enlace.');
    return false;
  }
}

export async function saveDocument(blob: Blob, name: string) {
  if (!isAndroidApp) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  try {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',', 2)[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const result = await NativeActions.saveDocument({ data, name, mime: blob.type || 'application/octet-stream' });
    return result.saved;
  } catch {
    window.alert('No se pudo guardar el archivo. Vuelve a intentarlo.');
    return false;
  }
}
