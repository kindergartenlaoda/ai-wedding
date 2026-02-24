import type { PromptStrategy } from './types';

export const animeStrategy: PromptStrategy = {
  systemPrompt: '你是一个专业的动漫风格转换专家。',
  generateAnalysisPrompt: () => `分析这张照片中的人物特征，生成5个动漫风格的AI图像生成提示词。

关键要求：
1. 保持人物基本特征（发型、五官比例等）
2. 转换为不同动漫风格（日系、韩系、吉卜力、新海诚等）
3. 包含背景、服装、色调等细节
4. 5个提示词风格各异
5. 返回JSON格式

JSON格式：
{
  "prompts": [
    { "index": 1, "chinese": "...", "english": "..." }
  ]
}`,
};
