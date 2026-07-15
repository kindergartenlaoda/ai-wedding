import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { PromptItem } from '@/types/prompt';

const STORE_DIR = path.join(process.cwd(), '.local');
const LIKES_PATH = path.join(STORE_DIR, 'image-likes.json');
const COMMENTS_PATH = path.join(STORE_DIR, 'gallery-comments.json');
const DOWNLOADS_PATH = path.join(STORE_DIR, 'image-downloads.json');
const FEEDBACKS_PATH = path.join(STORE_DIR, 'generation-feedbacks.json');
const PROMPTS_PATH = path.join(STORE_DIR, 'prompt-generations.json');
const ORDERS_PATH = path.join(STORE_DIR, 'orders.json');
const SUBSCRIPTIONS_PATH = path.join(STORE_DIR, 'subscriptions.json');

export interface LocalImageLike {
  id: string;
  user_id: string;
  generation_id: string;
  image_index: number;
  image_type: 'preview' | 'high_res';
  created_at: string;
}

export interface LocalGalleryComment {
  id: string;
  generation_id: string;
  user_id: string;
  user_name: string;
  user_image: string | null;
  content: string;
  created_at: string;
}

export interface LocalImageDownload {
  id: string;
  user_id: string;
  generation_id: string;
  image_index: number;
  image_type: 'preview' | 'high_res';
  order_id: string | null;
  created_at: string;
}

export interface LocalGenerationFeedback {
  id: string;
  generation_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalPromptGeneration {
  id: string;
  user_id: string;
  domain: string;
  prompts: PromptItem[];
  model_config_id: string | null;
  credits_used: number;
  created_at: string;
}

export interface LocalOrder {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  payment_method: string;
  payment_intent_id: string;
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface LocalSubscription {
  id: string;
  user_id: string;
  plan: string;
  status: 'active' | 'inactive' | 'expired';
  monthly_credits: number;
  started_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export function isLocalFeatureStoreEnabled(userId?: string): boolean {
  return process.env.LOCAL_ADMIN_MODE === 'true' && (!userId || userId === 'local-admin');
}

export async function listLocalLikedImageIndexes(
  userId: string,
  generationId: string,
  imageType: 'preview' | 'high_res',
): Promise<number[]> {
  const likes = await readJsonArray<LocalImageLike>(LIKES_PATH);
  return likes
    .filter((like) => like.user_id === userId && like.generation_id === generationId && like.image_type === imageType)
    .map((like) => like.image_index);
}

export async function setLocalImageLike(input: {
  userId: string;
  generationId: string;
  imageIndex: number;
  imageType: 'preview' | 'high_res';
  liked: boolean;
}): Promise<boolean> {
  const likes = await readJsonArray<LocalImageLike>(LIKES_PATH);
  const next = likes.filter((like) => !(
    like.user_id === input.userId
    && like.generation_id === input.generationId
    && like.image_index === input.imageIndex
    && like.image_type === input.imageType
  ));

  if (input.liked) {
    next.push({
      id: `local-like-${randomUUID()}`,
      user_id: input.userId,
      generation_id: input.generationId,
      image_index: input.imageIndex,
      image_type: input.imageType,
      created_at: new Date().toISOString(),
    });
  }

  await writeJsonArray(LIKES_PATH, next);
  return input.liked;
}

export async function countLocalGenerationLikes(generationId: string): Promise<number> {
  const likes = await readJsonArray<LocalImageLike>(LIKES_PATH);
  return likes.filter((like) => like.generation_id === generationId).length;
}

export async function listLocalComments(generationId: string, limit: number, offset: number) {
  const comments = await readJsonArray<LocalGalleryComment>(COMMENTS_PATH);
  const filtered = comments
    .filter((comment) => comment.generation_id === generationId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  return {
    comments: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

export async function createLocalComment(input: {
  generationId: string;
  userId: string;
  userName?: string | null;
  userImage?: string | null;
  content: string;
}): Promise<LocalGalleryComment> {
  const comment: LocalGalleryComment = {
    id: `local-comment-${randomUUID()}`,
    generation_id: input.generationId,
    user_id: input.userId,
    user_name: input.userName || 'Local Admin',
    user_image: input.userImage || null,
    content: input.content.trim(),
    created_at: new Date().toISOString(),
  };

  const comments = await readJsonArray<LocalGalleryComment>(COMMENTS_PATH);
  await writeJsonArray(COMMENTS_PATH, [comment, ...comments]);
  return comment;
}

export async function countLocalGenerationComments(generationId: string): Promise<number> {
  const comments = await readJsonArray<LocalGalleryComment>(COMMENTS_PATH);
  return comments.filter((comment) => comment.generation_id === generationId).length;
}

export async function createLocalDownload(input: {
  userId: string;
  generationId: string;
  imageIndex: number;
  imageType: 'preview' | 'high_res';
  orderId?: string | null;
}): Promise<LocalImageDownload> {
  const download: LocalImageDownload = {
    id: `local-download-${randomUUID()}`,
    user_id: input.userId,
    generation_id: input.generationId,
    image_index: input.imageIndex,
    image_type: input.imageType,
    order_id: input.orderId || null,
    created_at: new Date().toISOString(),
  };

  const downloads = await readJsonArray<LocalImageDownload>(DOWNLOADS_PATH);
  await writeJsonArray(DOWNLOADS_PATH, [download, ...downloads]);
  return download;
}

export async function countLocalUserEngagement(userId: string): Promise<{ likes: number; downloads: number }> {
  const [likes, downloads] = await Promise.all([
    readJsonArray<LocalImageLike>(LIKES_PATH),
    readJsonArray<LocalImageDownload>(DOWNLOADS_PATH),
  ]);

  return {
    likes: likes.filter((like) => like.user_id === userId).length,
    downloads: downloads.filter((download) => download.user_id === userId).length,
  };
}

export async function upsertLocalFeedback(input: {
  generationId: string;
  userId: string;
  rating: number;
  comment?: string | null;
}): Promise<LocalGenerationFeedback> {
  const feedbacks = await readJsonArray<LocalGenerationFeedback>(FEEDBACKS_PATH);
  const index = feedbacks.findIndex((feedback) => (
    feedback.generation_id === input.generationId && feedback.user_id === input.userId
  ));
  const now = new Date().toISOString();

  if (index >= 0) {
    feedbacks[index] = {
      ...feedbacks[index],
      rating: input.rating,
      comment: input.comment?.trim() || null,
      updated_at: now,
    };
    await writeJsonArray(FEEDBACKS_PATH, feedbacks);
    return feedbacks[index];
  }

  const feedback: LocalGenerationFeedback = {
    id: `local-feedback-${randomUUID()}`,
    generation_id: input.generationId,
    user_id: input.userId,
    rating: input.rating,
    comment: input.comment?.trim() || null,
    created_at: now,
    updated_at: now,
  };
  await writeJsonArray(FEEDBACKS_PATH, [feedback, ...feedbacks]);
  return feedback;
}

export async function getLocalFeedback(generationId: string, userId: string): Promise<LocalGenerationFeedback | null> {
  const feedbacks = await readJsonArray<LocalGenerationFeedback>(FEEDBACKS_PATH);
  return feedbacks.find((feedback) => feedback.generation_id === generationId && feedback.user_id === userId) ?? null;
}

export async function listLocalPromptGenerations(userId: string, limit: number, offset: number) {
  const records = await readJsonArray<LocalPromptGeneration>(PROMPTS_PATH);
  const filtered = records
    .filter((record) => record.user_id === userId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  return {
    records: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

export async function createLocalPromptGeneration(input: {
  userId: string;
  domain: string;
  prompts: PromptItem[];
  modelConfigId?: string | null;
  creditsUsed: number;
}): Promise<LocalPromptGeneration> {
  const record: LocalPromptGeneration = {
    id: `local-prompt-generation-${randomUUID()}`,
    user_id: input.userId,
    domain: input.domain,
    prompts: input.prompts,
    model_config_id: input.modelConfigId || null,
    credits_used: input.creditsUsed,
    created_at: new Date().toISOString(),
  };
  const records = await readJsonArray<LocalPromptGeneration>(PROMPTS_PATH);
  await writeJsonArray(PROMPTS_PATH, [record, ...records]);
  return record;
}

export async function createLocalOrder(input: {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  credits: number;
  status?: 'pending' | 'completed' | 'failed';
}): Promise<LocalOrder> {
  const now = new Date().toISOString();
  const order: LocalOrder = {
    id: `local-order-${randomUUID()}`,
    user_id: input.userId,
    amount: input.amount,
    currency: input.currency,
    status: input.status || 'completed',
    payment_method: input.paymentMethod,
    payment_intent_id: `local-payment-${randomUUID()}`,
    credits: input.credits,
    created_at: now,
    updated_at: now,
  };
  const orders = await readJsonArray<LocalOrder>(ORDERS_PATH);
  await writeJsonArray(ORDERS_PATH, [order, ...orders]);
  return order;
}

export async function getLocalOrderById(orderId: string, userId: string): Promise<LocalOrder | null> {
  const orders = await readJsonArray<LocalOrder>(ORDERS_PATH);
  return orders.find((order) => order.id === orderId && order.user_id === userId) ?? null;
}

export async function getLocalOrderByPaymentIntent(paymentIntentId: string, userId: string): Promise<LocalOrder | null> {
  const orders = await readJsonArray<LocalOrder>(ORDERS_PATH);
  return orders.find((order) => order.payment_intent_id === paymentIntentId && order.user_id === userId) ?? null;
}

export async function completeLocalOrder(paymentIntentId: string, userId: string): Promise<LocalOrder | null> {
  const orders = await readJsonArray<LocalOrder>(ORDERS_PATH);
  const index = orders.findIndex((order) => order.payment_intent_id === paymentIntentId && order.user_id === userId);
  if (index === -1) return null;
  orders[index] = {
    ...orders[index],
    status: 'completed',
    updated_at: new Date().toISOString(),
  };
  await writeJsonArray(ORDERS_PATH, orders);
  return orders[index];
}

export async function getActiveLocalSubscription(userId: string): Promise<LocalSubscription | null> {
  const now = Date.now();
  const subscriptions = await readJsonArray<LocalSubscription>(SUBSCRIPTIONS_PATH);
  return subscriptions
    .filter((subscription) => subscription.user_id === userId)
    .filter((subscription) => subscription.status === 'active' && Date.parse(subscription.expires_at) > now)
    .sort((a, b) => Date.parse(b.expires_at) - Date.parse(a.expires_at))[0] ?? null;
}

export async function createLocalSubscription(input: {
  userId: string;
  plan: string;
  monthlyCredits: number;
  durationMonths: number;
}): Promise<LocalSubscription> {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + input.durationMonths);

  const subscription: LocalSubscription = {
    id: `local-subscription-${randomUUID()}`,
    user_id: input.userId,
    plan: input.plan,
    status: 'active',
    monthly_credits: input.monthlyCredits,
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const subscriptions = await readJsonArray<LocalSubscription>(SUBSCRIPTIONS_PATH);
  await writeJsonArray(SUBSCRIPTIONS_PATH, [subscription, ...subscriptions]);
  return subscription;
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
