import type { PromptStrategy } from './types';

export const weddingStrategy: PromptStrategy = {
  systemPrompt: '你是一个专业的婚纱摄影风格分析师。',
  generateAnalysisPrompt: () => `分析这张婚纱照的风格，生成5个同类型的AI图像生成提示词。

关键要求：
1. 每个提示词都要包含"保持人物五官特征"这个核心要求
2. 中文和英文必须表达完全相同的意思
3. 描述要包含：场景、服装、姿势、光线、氛围等关键元素
4. 5个提示词要有细微差异
5. 必须返回完整的JSON格式

JSON格式：
{
  "prompts": [
    { "index": 1, "chinese": "...", "english": "..." }
  ]
}`,
};
