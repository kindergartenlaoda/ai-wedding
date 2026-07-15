import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const STORE_DIR = path.join(process.cwd(), '.local');
const PROJECTS_PATH = path.join(STORE_DIR, 'projects.json');
const GENERATIONS_PATH = path.join(STORE_DIR, 'generations.json');

export interface LocalProject {
  id: string;
  user_id: string;
  name: string;
  status: string;
  domain: string;
  uploaded_photos: string[];
  created_at: string;
  updated_at: string;
}

export interface LocalGeneration {
  id: string;
  project_id: string | null;
  user_id: string;
  template_id: string | null;
  domain: string;
  status: string;
  preview_images: string[];
  high_res_images: string[];
  error_message?: string;
  credits_used: number;
  is_shared_to_gallery: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  generation_type: 'batch' | 'single';
  prompt?: string | null;
  original_image?: string | null;
  settings?: object | null;
}

export function isLocalGenerationStoreEnabled(userId: string): boolean {
  return process.env.LOCAL_ADMIN_MODE === 'true' && userId === 'local-admin';
}

export function isLocalGenerationStoreAvailable(): boolean {
  return process.env.LOCAL_ADMIN_MODE === 'true';
}

export async function createLocalProject(input: {
  userId: string;
  name: string;
  domain?: string;
  uploadedPhotos?: string[];
}): Promise<LocalProject> {
  const now = new Date().toISOString();
  const project: LocalProject = {
    id: `local-project-${randomUUID()}`,
    user_id: input.userId,
    name: input.name,
    status: 'draft',
    domain: input.domain || 'wedding',
    uploaded_photos: input.uploadedPhotos || [],
    created_at: now,
    updated_at: now,
  };

  const projects = await readProjects();
  await writeProjects([project, ...projects]);
  return project;
}

export async function listLocalProjects(userId: string): Promise<LocalProject[]> {
  const projects = await readProjects();
  return projects
    .filter((project) => project.user_id === userId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export async function updateLocalProject(
  id: string,
  userId: string,
  input: { name?: string },
): Promise<LocalProject | null> {
  const projects = await readProjects();
  const index = projects.findIndex((project) => project.id === id && project.user_id === userId);
  if (index === -1) return null;

  const updated = {
    ...projects[index],
    ...(input.name !== undefined ? { name: input.name } : {}),
    updated_at: new Date().toISOString(),
  };
  projects[index] = updated;
  await writeProjects(projects);
  return updated;
}

export async function deleteLocalProject(id: string, userId: string): Promise<boolean> {
  const projects = await readProjects();
  const nextProjects = projects.filter((project) => !(project.id === id && project.user_id === userId));
  if (nextProjects.length === projects.length) return false;

  const generations = await readGenerations();
  await writeProjects(nextProjects);
  await writeGenerations(generations.filter((generation) => generation.project_id !== id));
  return true;
}

export async function createLocalGeneration(input: {
  userId: string;
  projectId?: string;
  templateId?: string;
  creditsUsed?: number;
  isSharedToGallery?: boolean;
  domain?: string;
  generationType?: 'batch' | 'single';
  prompt?: string;
  originalImage?: string;
  settings?: object;
}): Promise<LocalGeneration> {
  const now = new Date().toISOString();
  const generation: LocalGeneration = {
    id: `local-generation-${randomUUID()}`,
    project_id: input.generationType === 'single' ? null : input.projectId || null,
    user_id: input.userId,
    template_id: input.templateId || null,
    domain: input.domain || 'wedding',
    status: 'processing',
    preview_images: [],
    high_res_images: [],
    credits_used: input.creditsUsed || 0,
    is_shared_to_gallery: input.isSharedToGallery ?? false,
    created_at: now,
    updated_at: now,
    generation_type: input.generationType || 'batch',
    prompt: input.prompt || null,
    original_image: input.originalImage || null,
    settings: input.settings || null,
  };

  const generations = await readGenerations();
  await writeGenerations([generation, ...generations]);
  return generation;
}

export async function listLocalGenerations(userId: string, type?: 'batch' | 'single'): Promise<LocalGeneration[]> {
  const generations = await readGenerations();
  return generations
    .filter((generation) => generation.user_id === userId)
    .filter((generation) => !type || generation.generation_type === type)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export async function getLocalGeneration(id: string, userId: string): Promise<LocalGeneration | null> {
  const generations = await readGenerations();
  return generations.find((generation) => generation.id === id && generation.user_id === userId) ?? null;
}

export async function getLocalGenerationById(id: string): Promise<LocalGeneration | null> {
  const generations = await readGenerations();
  return generations.find((generation) => generation.id === id) ?? null;
}

export async function listLocalSharedGenerations(input: {
  domain?: string | null;
  limit: number;
  offset: number;
  sort?: string | null;
}): Promise<{ generations: LocalGeneration[]; total: number }> {
  const generations = await readGenerations();
  const filtered = generations
    .filter((generation) => generation.is_shared_to_gallery)
    .filter((generation) => !input.domain || generation.domain === input.domain);

  const sorted = filtered.sort((a, b) => {
    if (input.sort === 'popular') {
      return b.preview_images.length - a.preview_images.length;
    }
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });

  return {
    generations: sorted.slice(input.offset, input.offset + input.limit),
    total: sorted.length,
  };
}

export async function updateLocalGenerationShare(
  id: string,
  userId: string,
  isShared: boolean,
): Promise<LocalGeneration | null | 'not_completed'> {
  const generations = await readGenerations();
  const index = generations.findIndex((generation) => generation.id === id && generation.user_id === userId);
  if (index === -1) return null;
  if (generations[index].status !== 'completed') return 'not_completed';

  const updated: LocalGeneration = {
    ...generations[index],
    is_shared_to_gallery: isShared,
    updated_at: new Date().toISOString(),
  };
  generations[index] = updated;
  await writeGenerations(generations);
  return updated;
}

export async function updateLocalGeneration(
  id: string,
  userId: string,
  input: {
    status?: string;
    error_message?: string;
    completed_at?: string;
    preview_images?: string[];
    high_res_images?: string[];
    generated_images?: Array<{ image_url: string; image_type?: string }>;
  },
): Promise<LocalGeneration | null> {
  const generations = await readGenerations();
  const index = generations.findIndex((generation) => generation.id === id && generation.user_id === userId);
  if (index === -1) return null;

  const generatedPreviewImages = Array.isArray(input.generated_images)
    ? input.generated_images
        .filter((image) => (image.image_type || 'preview') === 'preview')
        .map((image) => image.image_url)
    : undefined;
  const generatedHighResImages = Array.isArray(input.generated_images)
    ? input.generated_images
        .filter((image) => image.image_type === 'high_res')
        .map((image) => image.image_url)
    : undefined;

  const nextPreviewImages = input.preview_images ?? generatedPreviewImages ?? generations[index].preview_images;
  const nextHighResImages = input.high_res_images
    ?? generatedHighResImages
    ?? (input.preview_images !== undefined || generatedPreviewImages !== undefined ? nextPreviewImages : generations[index].high_res_images);

  const updated: LocalGeneration = {
    ...generations[index],
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.error_message !== undefined ? { error_message: input.error_message } : {}),
    ...(input.completed_at !== undefined ? { completed_at: input.completed_at } : {}),
    preview_images: nextPreviewImages,
    high_res_images: nextHighResImages,
    updated_at: new Date().toISOString(),
  };

  generations[index] = updated;
  await writeGenerations(generations);
  return updated;
}

export async function deleteLocalGeneration(id: string, userId: string): Promise<boolean> {
  const generations = await readGenerations();
  const nextGenerations = generations.filter((generation) => !(generation.id === id && generation.user_id === userId));
  if (nextGenerations.length === generations.length) return false;
  await writeGenerations(nextGenerations);
  return true;
}

export function formatLocalProject(project: LocalProject) {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    uploaded_photos: project.uploaded_photos,
    created_at: project.created_at,
    updated_at: project.updated_at,
  };
}

export function formatLocalGeneration(generation: LocalGeneration) {
  const highResImages = generation.high_res_images.length > 0
    ? generation.high_res_images
    : generation.preview_images;

  return {
    id: generation.id,
    project_id: generation.project_id,
    template_id: generation.template_id,
    domain: generation.domain,
    status: generation.status,
    preview_images: generation.preview_images,
    high_res_images: highResImages,
    error_message: generation.error_message,
    credits_used: generation.credits_used,
    is_shared_to_gallery: generation.is_shared_to_gallery,
    completed_at: generation.completed_at || '',
    created_at: generation.created_at,
    updated_at: generation.updated_at,
    generation_type: generation.generation_type,
    prompt: generation.prompt,
    original_image: generation.original_image,
    generated_images: [
      ...generation.preview_images.map((image_url, image_index) => ({
        image_url,
        image_index,
        image_type: 'preview',
      })),
      ...highResImages.map((image_url, image_index) => ({
        image_url,
        image_index,
        image_type: 'high_res',
      })),
    ],
  };
}

async function readProjects(): Promise<LocalProject[]> {
  return readJsonArray<LocalProject>(PROJECTS_PATH);
}

async function writeProjects(projects: LocalProject[]): Promise<void> {
  await writeJsonArray(PROJECTS_PATH, projects);
}

async function readGenerations(): Promise<LocalGeneration[]> {
  return readJsonArray<LocalGeneration>(GENERATIONS_PATH);
}

async function writeGenerations(generations: LocalGeneration[]): Promise<void> {
  await writeJsonArray(GENERATIONS_PATH, generations);
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
