import type { PromptStrategy } from './types';

export const childrenStrategy: PromptStrategy = {
  systemPrompt: '你是一个专业的儿童摄影风格分析师。',
  generateAnalysisPrompt: () => `分析这张儿童照片，生成5个可爱童趣风格的AI图像生成提示词。

关键要求：
1. 保持儿童五官特征不变
2. 场景温馨可爱（公园、游乐场、花园等）
3. 色彩明亮温暖
4. 表情自然活泼
5. 返回JSON格式

JSON格式：
{
  "prompts": [
    { "index": 1, "chinese": "...", "english": "..." }
  ]
}`,
};
