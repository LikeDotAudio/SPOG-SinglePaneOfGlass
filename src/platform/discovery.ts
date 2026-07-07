// src/platform/discovery — zero-backend folder discovery, typed.
//
// Faithful port of the legacy js/globals.js fetchJSON + listDirectory: prefer an
// index.json manifest per folder (works on any static host), fall back to parsing
// autoindex HTML. The manifest contract must match the legacy app exactly, or the
// parity harness lies (A.8 "share data, don't fork"; the Audio/→Sound/ bug class).

import type { Manifest } from '../model/index.js';
import { getDraft } from './routes-store.js';

export interface Entry {
  name: string;
  href: string;
}
export interface Listing {
  dirs: Entry[];
  files: Entry[];
}

export async function fetchJSON<T = unknown>(url: string): Promise<T | null> {
  // Authoring overlay (audit §7): a drafted file wins over disk, so edits persist
  // and re-render with no backend. No draft → identical to the original fetch.
  const draft = getDraft<T>(url);
  if (draft != null) return draft;
  try {
    // no-store bypasses a stale browser cache (e.g. an empty copy cached before
    // the file existed), which otherwise yields "Unexpected end of JSON input".
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`fetchJSON: HTTP ${res.status} for ${url}`);
      return null;
    }
    const text = await res.text();
    if (!text.trim()) {
      console.warn(`fetchJSON: empty response for ${url}`);
      return null;
    }
    return JSON.parse(text) as T;
  } catch (e) {
    console.error('Failed to load:', url, e);
    return null;
  }
}

/**
 * List a directory's immediate contents (dirs + .json files), sorted naturally.
 * Prefers `${url}index.json`; falls back to autoindex HTML.
 */
export async function listDirectory(url: string): Promise<Listing> {
  const out: Listing = { dirs: [], files: [] };

  const add = (name: string, isDir: boolean, href: string): void => {
    if (!name || name === '.' || name.toLowerCase() === 'index.json') return;
    if (isDir) out.dirs.push({ name, href });
    else if (name.toLowerCase().endsWith('.json')) out.files.push({ name, href });
  };
  const sortAndReturn = (): Listing => {
    const byName = (a: Entry, b: Entry) =>
      a.name.localeCompare(b.name, undefined, { numeric: true });
    out.dirs.sort(byName);
    out.files.sort(byName);
    return out;
  };

  // 1) Manifest (preferred). A DRAFTED index.json (authoring / spreadsheet import)
  //    wins over disk, so newly-authored folders/files render with no backend —
  //    parity with fetchJSON's draft overlay (else listDirectory would bypass it).
  try {
    let manifest = getDraft<Manifest>(url + 'index.json');
    if (!Array.isArray(manifest)) {
      const res = await fetch(url + 'index.json', { cache: 'no-store' });
      if (res.ok) { const parsed = JSON.parse(await res.text()) as unknown; if (Array.isArray(parsed)) manifest = parsed as Manifest; }
    }
    if (Array.isArray(manifest)) {
      for (const entry of manifest) {
        if (typeof entry !== 'string' || !entry) continue;
        const isDir = entry.endsWith('/');
        const name = entry.replace(/\/$/, '');
        const href = encodeURIComponent(name) + (isDir ? '/' : '');
        add(name, isDir, href);
      }
      return sortAndReturn();
    }
  } catch {
    /* No manifest / not JSON — fall back to autoindex below. */
  }

  // 2) Autoindex HTML fallback.
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return sortAndReturn();
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) return;
      if (
        href.startsWith('?') || href.startsWith('#') || href.startsWith('/') ||
        href.startsWith('..') || /^[a-z]+:\/\//i.test(href)
      ) return;
      const isDir = href.endsWith('/');
      const name = decodeURIComponent(href.replace(/\/$/, ''));
      add(name, isDir, href);
    });
  } catch (e) {
    console.warn('listDirectory failed for', url, e);
  }
  return sortAndReturn();
}
