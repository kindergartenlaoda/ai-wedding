import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  CreateModelConfigInput,
  ModelConfig,
  ModelConfigSource,
  ModelConfigStatus,
  ModelConfigType,
  UpdateModelConfigInput,
} from '@/types/model-config';

const STORE_DIR = path.join(process.cwd(), '.local');
const STORE_PATH = path.join(STORE_DIR, 'model-configs.json');

type PrismaModelConfigTypeValue = 'generate_image' | 'identify_image' | 'generate_prompts' | 'other';

const TYPE_TO_APP: Record<string, ModelConfigType> = {
  generate_image: 'generate-image',
  'generate-image': 'generate-image',
  identify_image: 'identify-image',
  'identify-image': 'identify-image',
  generate_prompts: 'generate-prompts',
  'generate-prompts': 'generate-prompts',
  other: 'other',
};

export function isLocalModelConfigStoreEnabled(): boolean {
  return process.env.LOCAL_ADMIN_MODE === 'true';
}

export function prismaTypeToAppType(type: string): ModelConfigType {
  return TYPE_TO_APP[type] ?? 'other';
}

export function appTypeToPrismaType(type: ModelConfigType): PrismaModelConfigTypeValue {
  switch (type) {
    case 'generate-image':
      return 'generate_image';
    case 'identify-image':
      return 'identify_image';
    case 'generate-prompts':
      return 'generate_prompts';
    default:
      return 'other';
  }
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) return '***';
  return `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 3)}`;
}

export function withMaskedApiKey(config: ModelConfig) {
  return {
    id: config.id,
    type: config.type,
    name: config.name,
    api_base_url: config.api_base_url,
    model_name: config.model_name,
    status: config.status,
    source: config.source,
    description: config.description,
    created_at: config.created_at,
    updated_at: config.updated_at,
    created_by: config.created_by,
    api_key_masked: maskApiKey(config.api_key),
  };
}

export async function listLocalModelConfigs(): Promise<ModelConfig[]> {
  if (!isLocalModelConfigStoreEnabled()) return [];

  const configs = await readStore();
  if (configs.length > 0) return configs;

  const seeded = buildSeedConfig();
  if (!seeded) return [];

  await writeStore([seeded]);
  return [seeded];
}

export async function getLocalModelConfig(id: string): Promise<ModelConfig | null> {
  const configs = await listLocalModelConfigs();
  return configs.find((config) => config.id === id) ?? null;
}

export async function getActiveLocalModelConfig(
  type: string,
  source?: string,
): Promise<ModelConfig | null> {
  const appType = prismaTypeToAppType(type);
  const configs = await listLocalModelConfigs();
  return configs
    .filter((config) => config.type === appType && config.status === 'active')
    .filter((config) => !source || config.source === source)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0] ?? null;
}

export async function createLocalModelConfig(
  input: CreateModelConfigInput,
  createdBy?: string,
): Promise<ModelConfig> {
  const now = new Date().toISOString();
  const config: ModelConfig = {
    id: `local-${randomUUID()}`,
    type: normalizeType(input.type),
    name: input.name,
    api_base_url: input.api_base_url,
    api_key: input.api_key,
    model_name: input.model_name,
    status: normalizeStatus(input.status ?? 'inactive'),
    source: normalizeSource(input.source ?? 'openAi'),
    description: input.description || undefined,
    created_at: now,
    updated_at: now,
    created_by: createdBy,
  };

  const configs = await listLocalModelConfigs();
  const nextConfigs = config.status === 'active'
    ? configs.map((item) => item.type === config.type ? { ...item, status: 'inactive' as const, updated_at: now } : item)
    : configs;

  await writeStore([config, ...nextConfigs]);
  return config;
}

export async function updateLocalModelConfig(
  id: string,
  input: UpdateModelConfigInput,
): Promise<ModelConfig | null> {
  const configs = await listLocalModelConfigs();
  const index = configs.findIndex((config) => config.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const current = configs[index];
  const updated: ModelConfig = {
    ...current,
    ...(input.type !== undefined ? { type: normalizeType(input.type) } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.api_base_url !== undefined ? { api_base_url: input.api_base_url } : {}),
    ...(input.api_key !== undefined ? { api_key: input.api_key } : {}),
    ...(input.model_name !== undefined ? { model_name: input.model_name } : {}),
    ...(input.status !== undefined ? { status: normalizeStatus(input.status) } : {}),
    ...(input.source !== undefined ? { source: normalizeSource(input.source) } : {}),
    ...(input.description !== undefined ? { description: input.description || undefined } : {}),
    updated_at: now,
  };

  const nextConfigs = configs.map((config, configIndex) => {
    if (configIndex === index) return updated;
    if (updated.status === 'active' && config.type === updated.type) {
      return { ...config, status: 'inactive' as const, updated_at: now };
    }
    return config;
  });

  await writeStore(nextConfigs);
  return updated;
}

export async function deleteLocalModelConfig(id: string): Promise<boolean> {
  const configs = await listLocalModelConfigs();
  const nextConfigs = configs.filter((config) => config.id !== id);
  if (nextConfigs.length === configs.length) return false;
  await writeStore(nextConfigs);
  return true;
}

async function readStore(): Promise<ModelConfig[]> {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeConfig).filter(Boolean) as ModelConfig[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeStore(configs: ModelConfig[]): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(configs, null, 2)}\n`, 'utf8');
}

function buildSeedConfig(): ModelConfig | null {
  const apiBaseUrl = process.env.IMAGE_API_BASE_URL || process.env.OPENAI_BASE_URL;
  const apiKey = process.env.IMAGE_API_KEY || process.env.OPENAI_API_KEY;
  const modelName = process.env.IMAGE_IMAGE_MODEL
    || process.env.IMAGE_CHAT_MODEL
    || process.env.OPENAI_IMAGE_MODEL
    || process.env.OPENAI_MODEL;

  if (!apiBaseUrl || !apiKey || !modelName) return null;

  const now = new Date().toISOString();
  return {
    id: 'local-default-generate-image',
    type: 'generate-image',
    name: 'Local default image config',
    api_base_url: apiBaseUrl,
    api_key: apiKey,
    model_name: modelName,
    status: 'active',
    source: 'openAi',
    description: 'Local admin fallback configuration',
    created_at: now,
    updated_at: now,
    created_by: 'local-admin',
  };
}

function normalizeConfig(value: unknown): ModelConfig | null {
  if (!value || typeof value !== 'object') return null;
  const config = value as Partial<ModelConfig>;
  if (!config.id || !config.name || !config.api_base_url || !config.api_key || !config.model_name) {
    return null;
  }

  const now = new Date().toISOString();
  return {
    id: String(config.id),
    type: normalizeType(config.type),
    name: String(config.name),
    api_base_url: String(config.api_base_url),
    api_key: String(config.api_key),
    model_name: String(config.model_name),
    status: normalizeStatus(config.status),
    source: normalizeSource(config.source),
    description: typeof config.description === 'string' ? config.description : undefined,
    created_at: typeof config.created_at === 'string' ? config.created_at : now,
    updated_at: typeof config.updated_at === 'string' ? config.updated_at : now,
    created_by: typeof config.created_by === 'string' ? config.created_by : undefined,
  };
}

function normalizeType(type?: string): ModelConfigType {
  return TYPE_TO_APP[type ?? ''] ?? 'generate-image';
}

function normalizeStatus(status?: string): ModelConfigStatus {
  return status === 'active' ? 'active' : 'inactive';
}

function normalizeSource(source?: string): ModelConfigSource {
  if (source === 'openRouter' || source === '302' || source === 'openAi') return source;
  return 'openAi';
}
