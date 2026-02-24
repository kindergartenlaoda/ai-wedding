export interface PromptStrategy {
  systemPrompt: string;
  generateAnalysisPrompt: (imageDescription?: string) => string;
}
