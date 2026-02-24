import type { PromptStrategy } from './types';

export const portraitStrategy: PromptStrategy = {
  systemPrompt: '你是一个专业的人像摄影风格分析师。',
  generateAnalysisPrompt: () => `分析这张人像照片，生成5个专业人像写真风格的AI图像生成提示词。

关键要求：
1. 保持人物五官特征不变
2. 不同风格（商务、文艺、复古、时尚、自然）
3. 注重光影、构图、色调
4. 5个提示词风格各异
5. 返回JSON格式

JSON格式：
{
  "prompts": [
    { "index": 1, "chinese": "...", "english": "..." }
  ]
}`,
};
