import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { DOMAIN_CONFIG } from '@/types/domain';
import { fallbackTemplates } from '@/lib/fallback-templates';

const STORE_DIR = path.join(process.cwd(), '.local');
const DOMAINS_PATH = path.join(STORE_DIR, 'domains.json');
const TEMPLATES_PATH = path.join(STORE_DIR, 'admin-templates.json');
const ANNOUNCEMENTS_PATH = path.join(STORE_DIR, 'announcements.json');

export interface LocalDomain {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  cover_image: string | null;
  is_active: boolean;
  sort_order: number;
  require_face_detection: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalAdminTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  domain: string;
  preview_image_url: string | null;
  prompt_config: Record<string, unknown>;
  prompt_list: string[];
  prompt_descriptions: string[];
  prompt_count: number;
  price_credits: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface LocalAnnouncement {
  id: string;
  content: string;
  is_active: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export function isLocalAdminStoreEnabled(): boolean {
  return process.env.LOCAL_ADMIN_MODE === 'true';
}

export async function listLocalDomains(): Promise<LocalDomain[]> {
  const domains = await readJsonArray<LocalDomain>(DOMAINS_PATH);
  const seeded = seedDomains();
  if (domains.length > 0) {
    const existingSlugs = new Set(domains.map((domain) => domain.slug));
    const missingDomains = seeded.filter((domain) => !existingSlugs.has(domain.slug));
    if (missingDomains.length === 0) return sortDomains(domains);

    const merged = sortDomains([...domains, ...missingDomains]);
    await writeJsonArray(DOMAINS_PATH, merged);
    return merged;
  }
  await writeJsonArray(DOMAINS_PATH, seeded);
  return seeded;
}

export async function createLocalDomain(input: Partial<LocalDomain> & { slug: string; name: string }): Promise<LocalDomain | 'duplicate'> {
  const domains = await listLocalDomains();
  if (domains.some((domain) => domain.slug === input.slug)) return 'duplicate';
  const now = new Date().toISOString();
  const domain: LocalDomain = {
    id: `local-domain-${randomUUID()}`,
    slug: input.slug,
    name: input.name,
    description: input.description || '',
    icon: input.icon || 'Camera',
    color: input.color || 'from-pink-500 to-rose-500',
    cover_image: input.cover_image || null,
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? domains.length,
    require_face_detection: input.require_face_detection ?? false,
    created_at: now,
    updated_at: now,
  };
  await writeJsonArray(DOMAINS_PATH, sortDomains([...domains, domain]));
  return domain;
}

export async function getLocalDomain(id: string): Promise<LocalDomain | null> {
  const domains = await listLocalDomains();
  return domains.find((domain) => domain.id === id) ?? null;
}

export async function updateLocalDomain(id: string, input: Partial<LocalDomain>): Promise<LocalDomain | 'duplicate' | null> {
  const domains = await listLocalDomains();
  const index = domains.findIndex((domain) => domain.id === id);
  if (index === -1) return null;
  if (input.slug && domains.some((domain) => domain.slug === input.slug && domain.id !== id)) return 'duplicate';

  const updated: LocalDomain = {
    ...domains[index],
    ...input,
    updated_at: new Date().toISOString(),
  };
  domains[index] = updated;
  await writeJsonArray(DOMAINS_PATH, sortDomains(domains));
  return updated;
}

export async function deleteLocalDomain(id: string): Promise<boolean> {
  const domains = await listLocalDomains();
  const nextDomains = domains.filter((domain) => domain.id !== id);
  if (nextDomains.length === domains.length) return false;
  await writeJsonArray(DOMAINS_PATH, nextDomains);
  return true;
}

export async function listLocalAdminTemplates(): Promise<LocalAdminTemplate[]> {
  const templates = await readJsonArray<LocalAdminTemplate>(TEMPLATES_PATH);
  const seeded = seedTemplates();
  if (templates.length > 0) {
    const existingIds = new Set(templates.map((template) => template.id));
    const missingTemplates = seeded.filter((template) => !existingIds.has(template.id));
    if (missingTemplates.length === 0) return sortTemplates(templates);

    const merged = sortTemplates([...templates, ...missingTemplates]);
    await writeJsonArray(TEMPLATES_PATH, merged);
    return merged;
  }
  await writeJsonArray(TEMPLATES_PATH, seeded);
  return seeded;
}

export async function createLocalAdminTemplate(input: Partial<LocalAdminTemplate> & {
  name: string;
  category: string;
  domain: string;
  preview_image_url: string;
}): Promise<LocalAdminTemplate> {
  const templates = await listLocalAdminTemplates();
  const promptList = input.prompt_list || [];
  const template: LocalAdminTemplate = {
    id: `local-template-${randomUUID()}`,
    name: input.name,
    description: input.description || '',
    category: input.category,
    domain: input.domain,
    preview_image_url: input.preview_image_url,
    prompt_config: input.prompt_config || {},
    prompt_list: promptList,
    prompt_descriptions: input.prompt_descriptions || [],
    prompt_count: promptList.length,
    price_credits: input.price_credits ?? 10,
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? templates.length,
    created_at: new Date().toISOString(),
  };
  await writeJsonArray(TEMPLATES_PATH, sortTemplates([...templates, template]));
  return template;
}

export async function updateLocalAdminTemplate(id: string, input: Partial<LocalAdminTemplate>): Promise<LocalAdminTemplate | null> {
  const templates = await listLocalAdminTemplates();
  const index = templates.findIndex((template) => template.id === id);
  if (index === -1) return null;

  const promptList = input.prompt_list ?? templates[index].prompt_list;
  const updated: LocalAdminTemplate = {
    ...templates[index],
    ...input,
    prompt_list: promptList,
    prompt_count: promptList.length,
  };
  templates[index] = updated;
  await writeJsonArray(TEMPLATES_PATH, sortTemplates(templates));
  return updated;
}

export async function deleteLocalAdminTemplate(id: string): Promise<boolean> {
  const templates = await listLocalAdminTemplates();
  const nextTemplates = templates.filter((template) => template.id !== id);
  if (nextTemplates.length === templates.length) return false;
  await writeJsonArray(TEMPLATES_PATH, nextTemplates);
  return true;
}

export async function listLocalAnnouncements(): Promise<LocalAnnouncement[]> {
  const announcements = await readJsonArray<LocalAnnouncement>(ANNOUNCEMENTS_PATH);
  return sortAnnouncements(announcements);
}

export async function createLocalAnnouncement(input: { content: string; is_active?: boolean; published_at?: string }): Promise<LocalAnnouncement> {
  const announcements = await listLocalAnnouncements();
  const now = new Date().toISOString();
  const announcement: LocalAnnouncement = {
    id: `local-announcement-${randomUUID()}`,
    content: input.content.trim(),
    is_active: input.is_active ?? false,
    published_at: input.published_at ? new Date(input.published_at).toISOString() : now,
    created_at: now,
    updated_at: now,
  };
  await writeJsonArray(ANNOUNCEMENTS_PATH, sortAnnouncements([announcement, ...announcements]));
  return announcement;
}

export async function updateLocalAnnouncement(id: string, input: Partial<LocalAnnouncement>): Promise<LocalAnnouncement | null> {
  const announcements = await listLocalAnnouncements();
  const index = announcements.findIndex((announcement) => announcement.id === id);
  if (index === -1) return null;
  const updated: LocalAnnouncement = {
    ...announcements[index],
    ...input,
    ...(input.published_at ? { published_at: new Date(input.published_at).toISOString() } : {}),
    updated_at: new Date().toISOString(),
  };
  announcements[index] = updated;
  await writeJsonArray(ANNOUNCEMENTS_PATH, sortAnnouncements(announcements));
  return updated;
}

export async function deleteLocalAnnouncement(id: string): Promise<boolean> {
  const announcements = await listLocalAnnouncements();
  const nextAnnouncements = announcements.filter((announcement) => announcement.id !== id);
  if (nextAnnouncements.length === announcements.length) return false;
  await writeJsonArray(ANNOUNCEMENTS_PATH, nextAnnouncements);
  return true;
}

function seedDomains(): LocalDomain[] {
  const now = new Date().toISOString();
  return Object.values(DOMAIN_CONFIG).map((domain, index) => ({
    id: `local-domain-${domain.id}`,
    slug: domain.id,
    name: domain.name,
    description: domain.description,
    icon: 'Camera',
    color: domain.color,
    cover_image: null,
    is_active: true,
    sort_order: index,
    require_face_detection: false,
    created_at: now,
    updated_at: now,
  }));
}

function seedTemplates(): LocalAdminTemplate[] {
  return fallbackTemplates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    domain: template.domain || 'wedding',
    preview_image_url: template.preview_image_url,
    prompt_config: {},
    prompt_list: template.prompt_list,
    prompt_descriptions: template.prompt_descriptions,
    prompt_count: template.prompt_count,
    price_credits: template.price_credits,
    is_active: template.is_active,
    sort_order: template.sort_order,
    created_at: template.created_at,
  }));
}

function sortDomains(domains: LocalDomain[]): LocalDomain[] {
  return [...domains].sort((a, b) => a.sort_order - b.sort_order);
}

function sortTemplates(templates: LocalAdminTemplate[]): LocalAdminTemplate[] {
  return [...templates].sort((a, b) => a.sort_order - b.sort_order);
}

function sortAnnouncements(announcements: LocalAnnouncement[]): LocalAnnouncement[] {
  return [...announcements].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeJsonArray<T>(filePath: string, items: T[]): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(filePath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}
