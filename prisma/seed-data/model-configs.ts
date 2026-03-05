import {
  ModelConfigType,
  ModelConfigStatus,
  ModelConfigSource,
} from '../../generated/prisma/enums';

type ModelConfigSeed = {
  type: ModelConfigType;
  name: string;
  model_name: string;
  status: ModelConfigStatus;
  description: string;
  source: ModelConfigSource;
};

export const modelConfigsSeedData: ModelConfigSeed[] = [
  {
    type: ModelConfigType.generate_image,
    name: 'generate_image',
    model_name: 'gemini-2.5-flash-image',
    status: ModelConfigStatus.active,
    description: '',
    source: ModelConfigSource.openAi,
  },
  {
    type: ModelConfigType.identify_image,
    name: '图片识别',
    model_name: 'kimi-k2.5',
    status: ModelConfigStatus.active,
    description: '',
    source: ModelConfigSource.openAi,
  },
];
