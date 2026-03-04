import { z } from 'zod';

/**
 * 用户认证验证
 */
export const SignUpSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z
    .string()
    .min(8, '密码至少需要8个字符')
    .max(100, '密码不能超过100个字符')
    .regex(/[A-Z]/, '密码必须包含至少一个大写字母')
    .regex(/[a-z]/, '密码必须包含至少一个小写字母')
    .regex(/[0-9]/, '密码必须包含至少一个数字'),
  fullName: z
    .string()
    .min(2, '姓名至少需要2个字符')
    .max(50, '姓名不能超过50个字符'),
});

export const SignInSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

/**
 * 项目创建验证
 */
export const CreateProjectSchema = z.object({
  name: z
    .string()
    .min(1, '项目名称不能为空')
    .max(100, '项目名称不能超过100个字符'),
  templateId: z.string().min(1, '无效的模板ID'),
  uploadedPhotos: z
    .array(z.string().url('无效的图片URL'))
    .min(1, '至少需要上传1张照片')
    .max(10, '最多只能上传10张照片'),
});

/**
 * URL 格式验证（用于 image_inputs）
 * 只允许 http/https 协议，拒绝 file:// 等协议
 * data URL 限制大小为 10MB
 */
const imageUrlSchema = z.string().refine(
  (url) => {
    if (url.startsWith('data:')) {
      // 限制 data URL 大小为 10MB
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (url.length > maxSize) {
        return false;
      }
      return true;
    }
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  },
  { message: '无效的图片URL格式或data URL超过10MB限制' }
);

/**
 * AI图片生成验证
 */
export const GenerateImageSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt不能为空')
    .max(1500, 'Prompt不能超过1500个字符'),
  n: z.number().int().min(1).max(8).default(1),
  size: z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024'),
  response_format: z.enum(['url', 'b64_json']).default('url'),
  model: z.string().optional(),
  // 可选：图像输入（data URL），用于 chat/completions 图像编辑/条件生成
  image_inputs: z.array(imageUrlSchema).max(3).optional(),
  // 可选：模型来源
  source: z.enum(['openRouter', '302', 'openAi']).optional(),
  // 可选：创意程度参数
  temperature: z.number().min(0).max(2).default(0.2).optional(),
  top_p: z.number().min(0).max(1).default(0.7).optional(),
  // 可选：领域（wedding, children, id_photo 等），默认 wedding
  domain: z.string().optional(),
});

/**
 * 图片生成验证 V2（提示词后端化）
 * 支持两种模式：模板模式（template_id + prompt_index）和自定义模式（custom_prompt）
 */
const generateCommonFields = {
  image_inputs: z.array(imageUrlSchema).max(3).optional(),
  source: z.enum(['openRouter', '302', 'openAi']).optional(),
  face_preservation: z.enum(['high', 'medium', 'low']).default('high'),
  creativity_level: z.enum(['conservative', 'balanced', 'creative']).default('conservative'),
};

/**
 * 图片生成验证 V2（提示词后端化）
 * 使用 discriminatedUnion 确保模板模式和自定义模式互斥
 */
export const GenerateImageV2Schema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('template'),
    template_id: z.string().min(1, '模板ID不能为空'),
    prompt_index: z.number().int().min(0).default(0),
    ...generateCommonFields,
  }).strict(),
  z.object({
    mode: z.literal('custom'),
    custom_prompt: z.string().min(1, '提示词不能为空').max(1500, '提示词不能超过1500个字符'),
    ...generateCommonFields,
  }).strict(),
]);

/**
 * 订单创建验证
 */
export const CreateOrderSchema = z.object({
  plan: z.enum(['Starter', 'Popular', 'Premium'], {
    message: '无效的套餐类型',
  }),
  generationId: z.string().min(1).optional(),
  selectedImages: z.array(z.number().int().min(0)).optional(),
});

/**
 * 图片下载追踪验证
 */
export const TrackDownloadSchema = z.object({
  generation_id: z.string().min(1, '无效的生成ID'),
  index: z.number().int().min(0, '无效的图片索引'),
  image_type: z.enum(['preview', 'high_res']).default('preview'),
});

/**
 * 分页参数验证
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(20),
});

/**
 * 搜索查询验证
 */
export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  category: z.string().optional(),
  sortBy: z.enum(['created_at', 'name', 'price']).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * 模板筛选验证
 */
export const TemplateFilterSchema = z.object({
  category: z.string().optional(),
  minPrice: z.number().int().min(0).optional(),
  maxPrice: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});

/**
 * 图片 Base64 验证函数
 * 验证图片格式和大小
 */
function validateImageBase64(base64: string): boolean {
  try {
    if (!base64.startsWith('data:image/')) return false;

    const parts = base64.split(',');
    if (parts.length !== 2) return false;

    const buffer = Buffer.from(parts[1], 'base64');

    const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;

    if (!isJPEG && !isPNG) return false;

    return buffer.length <= 10 * 1024 * 1024;
  } catch {
    return false;
  }
}

/**
 * 提示词生成验证
 */
export const GeneratePromptsSchema = z.object({
  imageBase64: z.string()
    .min(100, '图片数据无效')
    .refine(validateImageBase64, {
      message: '无效的图片格式（仅支持 JPEG/PNG，最大 10MB）',
    }),
  domain: z.string().optional().default('wedding'),
});

/**
 * 辅助函数：验证并解析数据
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return {
        success: false,
        error: firstError.message,
      };
    }
    return {
      success: false,
      error: '验证失败',
    };
  }
}

/**
 * 辅助函数：安全解析（不抛出错误）
 */
export function safeParseData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

// 导出类型
export type SignUpInput = z.infer<typeof SignUpSchema>;
export type SignInInput = z.infer<typeof SignInSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type GenerateImageInput = z.infer<typeof GenerateImageSchema>;
export type GenerateImageV2Input = z.infer<typeof GenerateImageV2Schema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type TrackDownloadInput = z.infer<typeof TrackDownloadSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
export type GeneratePromptsInput = z.infer<typeof GeneratePromptsSchema>;
export type TemplateFilterInput = z.infer<typeof TemplateFilterSchema>;
