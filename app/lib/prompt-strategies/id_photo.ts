import type { PromptStrategy } from './types';

export const idPhotoStrategy: PromptStrategy = {
  systemPrompt: '你是一个专业的证件照处理专家。',
  generateAnalysisPrompt: () => `分析这张照片，生成5个证件照风格的AI图像生成提示词。

关键要求：
1. 保持人物五官特征不变
2. 生成不同底色（白色、蓝色、红色等）的证件照
3. 确保光线均匀、表情自然、姿势端正
4. 符合标准证件照规格
5. 返回JSON格式

JSON格式：
{
  "prompts": [
    { "index": 1, "chinese": "...", "english": "..." }
  ]
}`,
};
