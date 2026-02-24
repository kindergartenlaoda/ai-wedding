import type { PromptStrategy } from './types';

export const productStrategy: PromptStrategy = {
  systemPrompt: '你是一个专业的商品摄影风格分析师。',
  generateAnalysisPrompt: () => `分析这张商品图片，生成5个专业商品展示风格的AI图像生成提示词。

关键要求：
1. 保持商品外观特征不变
2. 不同场景（纯色背景、生活场景、创意摆拍等）
3. 专业的商品摄影光线
4. 提升商品质感和吸引力
5. 返回JSON格式

JSON格式：
{
  "prompts": [
    { "index": 1, "chinese": "...", "english": "..." }
  ]
}`,
};
