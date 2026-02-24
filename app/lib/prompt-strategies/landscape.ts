import type { PromptStrategy } from './types';

export const landscapeStrategy: PromptStrategy = {
  systemPrompt: '你是一个专业的风景摄影风格分析师。',
  generateAnalysisPrompt: () => `分析这张风景照片，生成5个不同风格的风景AI图像生成提示词。

关键要求：
1. 保持原始场景的核心元素
2. 不同时间段和天气（日出、黄昏、星空、雨后等）
3. 不同风格（写实、梦幻、HDR、极简等）
4. 注重色彩和氛围
5. 返回JSON格式

JSON格式：
{
  "prompts": [
    { "index": 1, "chinese": "...", "english": "..." }
  ]
}`,
};
