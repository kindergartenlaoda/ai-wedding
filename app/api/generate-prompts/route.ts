import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { getPromptStrategy } from '@/lib/prompt-strategies';
import type { ModelConfig } from '@/types/model-config';
import type { PromptItem } from '@/types/prompt';
import { isValidDomain } from '@/types/domain';
import { ModelConfigType } from '../../../generated/prisma/enums';

async function getActivePromptsConfig(): Promise<ModelConfig | null> {
  try {
    const config = await prisma.modelConfig.findFirst({
      where: { type: ModelConfigType.generate_prompts, status: 'active' },
    });
    if (!config) return null;
    return {
      id: config.id,
      type: config.type as ModelConfig['type'],
      name: config.name,
      api_base_url: config.apiBaseUrl,
      api_key: config.apiKey,
      model_name: config.modelName,
      status: config.status as ModelConfig['status'],
      source: config.source as ModelConfig['source'],
      description: config.description ?? undefined,
      created_at: config.createdAt.toISOString(),
      updated_at: config.updatedAt.toISOString(),
      created_by: config.createdBy ?? undefined,
    };
  } catch (err) {
    console.error('获取激活提示词生成配置异常:', err);
    return null;
  }
}

/**
 * 使用 OpenAI 兼容 API 分析图片并生成提示词
 */
async function generatePromptsWithStrategy(
  imageBase64: string,
  apiBaseUrl: string,
  apiKey: string,
  model: string,
  analysisPrompt: string
): Promise<PromptItem[]> {
  const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  // 确保 base64 格式正确
  const base64Data = imageBase64.includes('base64,') 
    ? imageBase64 
    : `data:image/jpeg;base64,${imageBase64}`;

  const fullPrompt = `${analysisPrompt}

重要：中文和英文必须表达相同的内容，不要让英文比中文更详细或更简略。请返回完整的5个提示词。`;

  const requestData = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: fullPrompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: base64Data,
            },
          },
        ],
      },
    ],
    max_tokens: 4000,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  };

  console.log(`[generatePromptsWithStrategy] 调用 API: ${endpoint}`);
  console.log(`[generatePromptsWithStrategy] 模型: ${model}`);
  console.log(`[generatePromptsWithStrategy] 图片大小: ${base64Data.length} 字符`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestData),
  });

  console.log(`[generatePromptsWithStrategy] API 响应状态: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[generatePromptsWithStrategy] API 错误响应:`, errorText.substring(0, 500));
    throw new Error(`提示词生成 API 请求失败: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const finishReason = result.choices?.[0]?.finish_reason;
  
  console.log(`[generatePromptsWithStrategy] API 完整响应结构:`, JSON.stringify({
    hasChoices: !!result.choices,
    choicesLength: result.choices?.length,
    hasMessage: !!result.choices?.[0]?.message,
    hasContent: !!result.choices?.[0]?.message?.content,
    contentType: typeof result.choices?.[0]?.message?.content,
    contentLength: result.choices?.[0]?.message?.content?.length,
    finishReason: finishReason
  }));

  // 检查是否因为长度限制而被截断
  if (finishReason === 'length') {
    console.error(`[generatePromptsWithStrategy] 响应被截断，finish_reason: length`);
    throw new Error('生成的内容过长被截断，请重试');
  }

  const content = result.choices?.[0]?.message?.content || '';
  console.log(`[generatePromptsWithStrategy] 提取的内容前 300 字符:`, content.substring(0, 300));
  console.log(`[generatePromptsWithStrategy] 内容总长度:`, content.length);

  // 解析 JSON 响应
  try {
    const parsed = JSON.parse(content);
    console.log(`[generatePromptsWithStrategy] 解析成功，结构:`, JSON.stringify({
      hasPrompts: !!parsed.prompts,
      promptsIsArray: Array.isArray(parsed.prompts),
      promptsLength: parsed.prompts?.length
    }));
    
    if (!parsed.prompts || !Array.isArray(parsed.prompts)) {
      console.error(`[generatePromptsWithStrategy] 格式错误，完整内容:`, content);
      throw new Error('返回格式不正确：缺少 prompts 数组');
    }
    
    if (parsed.prompts.length === 0) {
      console.error(`[generatePromptsWithStrategy] 提示词数组为空`);
      throw new Error('生成的提示词数量为 0');
    }
    
    // 验证每个提示词的结构
    for (const prompt of parsed.prompts) {
      if (!prompt.chinese || !prompt.english || typeof prompt.index !== 'number') {
        console.error(`[generatePromptsWithStrategy] 提示词结构不完整:`, JSON.stringify(prompt));
        throw new Error('提示词结构不完整，缺少必要字段');
      }
    }
    
    console.log(`[generatePromptsWithStrategy] ✅ 成功返回 ${parsed.prompts.length} 个提示词`);
    return parsed.prompts as PromptItem[];
  } catch (err) {
    console.error(`[generatePromptsWithStrategy] ❌ JSON 解析失败`);
    console.error(`[generatePromptsWithStrategy] 错误:`, err);
    console.error(`[generatePromptsWithStrategy] 原始内容长度:`, content.length);
    console.error(`[generatePromptsWithStrategy] 原始内容:`, content);
    
    // 如果是 JSON 解析错误，提供更友好的错误信息
    if (err instanceof SyntaxError) {
      throw new Error(`JSON 格式错误：${err.message}。可能是内容被截断，请重试`);
    }
    
    throw new Error('无法解析生成的提示词，请重试');
  }
}

/**
 * POST /api/generate-prompts
 * 根据图片生成风格提示词
 */
export async function POST(req: NextRequest) {
  const requestId = `prompts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] ========== 开始处理提示词生成请求 ==========`);

  try {
    // 1) 认证校验
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    console.log(`[${requestId}] ✅ 用户认证成功: ${authResult.user.id}`);

    // 2) 获取提示词生成模型配置
    const dbConfig = await getActivePromptsConfig();

    if (!dbConfig) {
      console.error(`[${requestId}] ❌ 未找到激活的提示词生成配置`);
      return NextResponse.json(
        { success: false, error: '暂无可用的提示词生成配置，请联系管理员' },
        { status: 500 }
      );
    }

    console.log(`[${requestId}] ✅ 使用数据库配置: ${dbConfig.name} (ID: ${dbConfig.id})`);

    // 3) 解析请求体
    const body = await req.json();
    const { imageBase64, domain } = body as { imageBase64: string; domain?: string };

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: '缺少图片参数' },
        { status: 400 }
      );
    }

    const resolvedDomain = domain && isValidDomain(domain) ? domain : 'wedding';
    const strategy = getPromptStrategy(resolvedDomain);
    const analysisPrompt = strategy.generateAnalysisPrompt();

    console.log(`[${requestId}] 使用领域策略: ${resolvedDomain}`);
    console.log(`[${requestId}] 开始生成提示词...`);

    // 4) 生成提示词
    const prompts = await generatePromptsWithStrategy(
      imageBase64,
      dbConfig.api_base_url,
      dbConfig.api_key,
      dbConfig.model_name,
      analysisPrompt
    );

    console.log(`[${requestId}] ✅ 成功生成 ${prompts.length} 个提示词`);

    return NextResponse.json({
      success: true,
      prompts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error(`[${requestId}] ❌ 发生异常:`, err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

