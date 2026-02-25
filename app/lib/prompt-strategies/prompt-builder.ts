import type { PromptStrategy } from './types';

/**
 * Domain-specific prompt configuration
 */
interface DomainPromptConfig {
  role: string;              // 角色描述，如 "婚纱摄影风格分析师"
  photoType: string;         // 照片类型，如 "婚纱照"
  requirements: string[];    // 关键要求列表（5条）
}

/**
 * Default domain configurations
 * These can be overridden by database configurations in the future
 */
const DEFAULT_CONFIGS: Record<string, DomainPromptConfig> = {
  wedding: {
    role: '婚纱摄影风格分析师',
    photoType: '婚纱照',
    requirements: [
      '每个提示词都要包含"保持人物五官特征"这个核心要求',
      '中文和英文必须表达完全相同的意思',
      '描述要包含：场景、服装、姿势、光线、氛围等关键元素',
      '5个提示词要有细微差异',
      '必须返回完整的JSON格式',
    ],
  },
  children: {
    role: '儿童摄影风格分析师',
    photoType: '儿童照片',
    requirements: [
      '保持儿童五官特征不变',
      '场景温馨可爱（公园、游乐场、花园等）',
      '色彩明亮温暖',
      '表情自然活泼',
      '返回JSON格式',
    ],
  },
  id_photo: {
    role: '证件照处理专家',
    photoType: '照片',
    requirements: [
      '保持人物五官特征不变',
      '生成不同底色（白色、蓝色、红色等）的证件照',
      '确保光线均匀、表情自然、姿势端正',
      '符合标准证件照规格',
      '返回JSON格式',
    ],
  },
  artistic: {
    role: '艺术摄影创意总监',
    photoType: '照片',
    requirements: [
      '保持人物基本特征',
      '融入不同艺术风格（油画、水彩、赛博朋克、超现实等）',
      '注重创意表达和视觉冲击力',
      '5个提示词风格差异明显',
      '返回JSON格式',
    ],
  },
  portrait: {
    role: '人像摄影风格分析师',
    photoType: '人像照片',
    requirements: [
      '保持人物五官特征不变',
      '不同风格（商务、文艺、复古、时尚、自然）',
      '注重光影、构图、色调',
      '5个提示词风格各异',
      '返回JSON格式',
    ],
  },
  anime: {
    role: '动漫风格转换专家',
    photoType: '照片中的人物特征',
    requirements: [
      '保持人物基本特征（发型、五官比例等）',
      '转换为不同动漫风格（日系、韩系、吉卜力、新海诚等）',
      '包含背景、服装、色调等细节',
      '5个提示词风格各异',
      '返回JSON格式',
    ],
  },
  landscape: {
    role: '风景摄影风格分析师',
    photoType: '风景照片',
    requirements: [
      '保持原始场景的核心元素',
      '不同时间段和天气（日出、黄昏、星空、雨后等）',
      '不同风格（写实、梦幻、HDR、极简等）',
      '注重色彩和氛围',
      '返回JSON格式',
    ],
  },
  product: {
    role: '商品摄影风格分析师',
    photoType: '商品图片',
    requirements: [
      '保持商品外观特征不变',
      '不同场景（纯色背景、生活场景、创意摆拍等）',
      '专业的商品摄影光线',
      '提升商品质感和吸引力',
      '返回JSON格式',
    ],
  },
};

/**
 * Unified PromptBuilder class
 * Replaces 8 separate strategy files with a single configurable builder
 */
export class PromptBuilder {
  private config: DomainPromptConfig;

  constructor(domain: string, customConfig?: Partial<DomainPromptConfig>) {
    // Get default config or use fallback
    const defaultConfig = DEFAULT_CONFIGS[domain] || DEFAULT_CONFIGS.wedding;

    // Merge with custom config if provided
    this.config = {
      ...defaultConfig,
      ...customConfig,
    };
  }

  /**
   * Build system prompt
   */
  getSystemPrompt(): string {
    return `你是一个专业的${this.config.role}。`;
  }

  /**
   * Build analysis prompt
   */
  getAnalysisPrompt(imageDescription?: string): string {
    const requirementsList = this.config.requirements
      .map((req, index) => `${index + 1}. ${req}`)
      .join('\n');

    return `分析这张${this.config.photoType}，生成5个${this.getStyleDescription()}的AI图像生成提示词。

关键要求：
${requirementsList}

JSON格式：
{
  "prompts": [
    { "index": 1, "chinese": "...", "english": "..." }
  ]
}`;
  }

  /**
   * Get style description based on domain
   */
  private getStyleDescription(): string {
    const domain = Object.keys(DEFAULT_CONFIGS).find(
      key => DEFAULT_CONFIGS[key] === this.config
    );

    const styleMap: Record<string, string> = {
      wedding: '同类型',
      children: '可爱童趣风格',
      id_photo: '证件照风格',
      artistic: '创意艺术风格',
      portrait: '专业人像写真风格',
      anime: '动漫风格',
      landscape: '不同风格的风景',
      product: '专业商品展示风格',
    };

    return styleMap[domain || 'wedding'] || '同类型';
  }

  /**
   * Convert to PromptStrategy interface
   */
  toStrategy(): PromptStrategy {
    return {
      systemPrompt: this.getSystemPrompt(),
      generateAnalysisPrompt: (imageDescription?: string) =>
        this.getAnalysisPrompt(imageDescription),
    };
  }
}

/**
 * Create a PromptStrategy for a given domain
 */
export function createPromptStrategy(
  domain: string,
  customConfig?: Partial<DomainPromptConfig>
): PromptStrategy {
  const builder = new PromptBuilder(domain, customConfig);
  return builder.toStrategy();
}
