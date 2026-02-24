import type { PromptStrategy } from './types';

export const artisticStrategy: PromptStrategy = {
  systemPrompt: '你是一个专业的艺术摄影创意总监。',
  generateAnalysisPrompt: () => `分析这张照片，生成5个创意艺术风格的AI图像生成提示词。

关键要求：
1. 保持人物基本特征
2. 融入不同艺术风格（油画、水彩、赛博朋克、超现实等）
3. 注重创意表达和视觉冲击力
4. 5个提示词风格差异明显
5. 返回JSON格式

JSON格式：
{
  "prompts": [
    { "index": 1, "chinese": "...", "english": "..." }
  ]
}`,
};
