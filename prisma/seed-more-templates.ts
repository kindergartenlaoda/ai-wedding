import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seedMoreTemplates() {
  try {
    console.log('开始添加更多模板变体...\n');

    // AI 个人写真 (portrait) - 新增变体
    const portraitTemplates = [
      {
        name: '中国风古装写真',
        description: '汉服、旗袍等中国传统服饰人像,融合古典美学与现代摄影技法',
        category: 'artistic',
        domain: 'portrait',
        preview_image_url: 'https://images.pexels.com/photos/3394309/pexels-photo-3394309.jpeg',
        prompt_config: {
          basePrompt: 'Chinese traditional costume portrait, hanfu or qipao, classical aesthetics',
          style: 'Chinese classical photography',
          lighting: 'soft natural light with warm tones',
          background: 'traditional Chinese garden or ancient architecture'
        },
        prompt_list: [
          'Chinese traditional hanfu portrait, elegant classical costume, ancient garden background, soft warm lighting, traditional Chinese aesthetics, graceful pose',
          'Qipao portrait, traditional Chinese dress, classical beauty, vintage photography style, elegant atmosphere, Chinese cultural heritage'
        ],
        price_credits: 15,
        is_active: true,
        sort_order: 105,
      },
      {
        name: '森系自然风写真',
        description: '森林、花田等自然环境人像,清新脱俗的自然系风格',
        category: 'outdoor',
        domain: 'portrait',
        preview_image_url: 'https://images.pexels.com/photos/3394311/pexels-photo-3394311.jpeg',
        prompt_config: {
          basePrompt: 'forest nature portrait, natural environment, fresh and pure style',
          style: 'nature photography',
          lighting: 'dappled natural sunlight',
          background: 'forest, flower field or natural scenery'
        },
        prompt_list: [
          'Forest portrait, natural light through trees, fresh and pure atmosphere, casual outfit, dappled sunlight, nature photography style, serene and peaceful mood',
          'Flower field portrait, natural environment, soft golden hour light, flowing dress, fresh and romantic atmosphere, outdoor nature photography'
        ],
        price_credits: 12,
        is_active: true,
        sort_order: 106,
      },
      {
        name: '城市街拍风格',
        description: '都市街头人像,时尚感与城市气息融合,展现现代都市生活态度',
        category: 'urban',
        domain: 'portrait',
        preview_image_url: 'https://images.pexels.com/photos/3394312/pexels-photo-3394312.jpeg',
        prompt_config: {
          basePrompt: 'urban street portrait, city background, modern fashion style',
          style: 'street photography',
          lighting: 'urban natural light',
          background: 'city streets, buildings, urban environment'
        },
        prompt_list: [
          'Urban street portrait, modern city background, fashionable outfit, natural urban lighting, candid street photography style, contemporary lifestyle',
          'City street fashion portrait, metropolitan environment, trendy style, dynamic urban atmosphere, modern photography aesthetic'
        ],
        price_credits: 12,
        is_active: true,
        sort_order: 107,
      },
      {
        name: '黑白艺术人像',
        description: '经典黑白人像摄影,强调光影对比与情感表达,永恒的艺术美感',
        category: 'artistic',
        domain: 'portrait',
        preview_image_url: 'https://images.pexels.com/photos/3394313/pexels-photo-3394313.jpeg',
        prompt_config: {
          basePrompt: 'black and white artistic portrait, high contrast, emotional expression',
          style: 'fine art black and white photography',
          lighting: 'dramatic chiaroscuro lighting',
          color: 'monochrome, high contrast'
        },
        prompt_list: [
          'Black and white artistic portrait, dramatic lighting, strong contrast, emotional expression, fine art photography style, timeless aesthetic',
          'Monochrome portrait, chiaroscuro lighting, deep shadows and highlights, expressive face, classic black and white photography'
        ],
        price_credits: 15,
        is_active: true,
        sort_order: 108,
      },
    ];

    // AI 儿童照 (children) - 新增变体
    const childrenTemplates = [
      {
        name: '太空宇航员主题',
        description: '宇航员主题儿童照,星际探索与宇宙梦想,激发孩子对科学的热爱',
        category: 'theme',
        domain: 'children',
        preview_image_url: 'https://images.pexels.com/photos/3394314/pexels-photo-3394314.jpeg',
        prompt_config: {
          basePrompt: 'astronaut theme children portrait, space exploration, cosmic background',
          style: 'creative themed photography',
          lighting: 'dramatic space-inspired lighting',
          background: 'space, stars, planets'
        },
        prompt_list: [
          'Child astronaut portrait, space suit costume, cosmic background with stars and planets, dramatic lighting, space exploration theme, imaginative and inspiring',
          'Kids space theme photo, astronaut outfit, galaxy background, futuristic atmosphere, creative children photography'
        ],
        price_credits: 15,
        is_active: true,
        sort_order: 116,
      },
      {
        name: '魔法师/魔女主题',
        description: '魔法主题儿童照,神秘魔法世界与奇幻氛围,让孩子体验魔法的奇妙',
        category: 'theme',
        domain: 'children',
        preview_image_url: 'https://images.pexels.com/photos/3394315/pexels-photo-3394315.jpeg',
        prompt_config: {
          basePrompt: 'wizard witch theme children portrait, magical fantasy world',
          style: 'fantasy themed photography',
          lighting: 'magical glowing light effects',
          background: 'enchanted forest or magical castle'
        },
        prompt_list: [
          'Child wizard portrait, magical costume with hat and wand, enchanted forest background, mystical glowing effects, fantasy photography style',
          'Little witch children photo, magical outfit, spellcasting pose, mysterious atmosphere, fantasy world background, creative themed photography'
        ],
        price_credits: 15,
        is_active: true,
        sort_order: 117,
      },
      {
        name: '运动员主题',
        description: '运动主题儿童照,足球、篮球、游泳等运动场景,培养孩子的运动精神',
        category: 'theme',
        domain: 'children',
        preview_image_url: 'https://images.pexels.com/photos/3394316/pexels-photo-3394316.jpeg',
        prompt_config: {
          basePrompt: 'sports theme children portrait, athletic activities, energetic',
          style: 'sports photography',
          lighting: 'bright outdoor or stadium lighting',
          background: 'sports field or gym'
        },
        prompt_list: [
          'Child sports portrait, athletic outfit, dynamic action pose, sports field background, energetic and confident expression, sports photography style',
          'Kids athlete photo, sports uniform, active pose, stadium or field background, bright lighting, youthful energy and enthusiasm'
        ],
        price_credits: 12,
        is_active: true,
        sort_order: 118,
      },
      {
        name: '艺术家主题',
        description: '小画家、小音乐家等艺术主题儿童照,展现孩子的艺术天赋与创造力',
        category: 'theme',
        domain: 'children',
        preview_image_url: 'https://images.pexels.com/photos/3394317/pexels-photo-3394317.jpeg',
        prompt_config: {
          basePrompt: 'artist theme children portrait, painting or music, creative atmosphere',
          style: 'artistic themed photography',
          lighting: 'warm creative studio lighting',
          background: 'art studio or music room'
        },
        prompt_list: [
          'Child artist portrait, painting smock with colorful paint, art studio background, creative atmosphere, warm lighting, artistic and imaginative',
          'Little musician children photo, instrument in hand, music room background, focused expression, warm studio lighting, artistic theme photography'
        ],
        price_credits: 12,
        is_active: true,
        sort_order: 119,
      },
    ];

    // AI 证件照 (id_photo) - 新增变体
    const idPhotoTemplates = [
      {
        name: '会计师证照片',
        description: '符合注册会计师证标准的证件照,白色背景,正面免冠,专业财务形象',
        category: 'professional',
        domain: 'id_photo',
        preview_image_url: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg',
        prompt_config: {
          basePrompt: 'accountant certificate photo, white background, formal attire',
          style: 'official ID photography',
          background: 'pure white',
          requirements: 'front facing, no hat, formal business attire'
        },
        prompt_list: [
          'Professional accountant ID photo, white background, formal business attire, front facing, neutral expression, sharp focus, official certificate standard'
        ],
        price_credits: 10,
        is_active: true,
        sort_order: 115,
      },
      {
        name: '工程师职称证照片',
        description: '符合工程师职称证标准的证件照,专业技术人员形象',
        category: 'professional',
        domain: 'id_photo',
        preview_image_url: 'https://images.pexels.com/photos/3184293/pexels-photo-3184293.jpeg',
        prompt_config: {
          basePrompt: 'engineer professional certificate photo, white background, technical professional',
          style: 'official ID photography',
          background: 'pure white',
          requirements: 'front facing, no hat, professional attire'
        },
        prompt_list: [
          'Engineer professional ID photo, white background, professional attire, front facing, competent expression, sharp focus, technical certificate standard'
        ],
        price_credits: 10,
        is_active: true,
        sort_order: 116,
      },
      {
        name: '彩色背景证件照',
        description: '红色、蓝色、白色等多种背景色可选的标准证件照',
        category: 'standard',
        domain: 'id_photo',
        preview_image_url: 'https://images.pexels.com/photos/3184294/pexels-photo-3184294.jpeg',
        prompt_config: {
          basePrompt: 'ID photo with colored background, red or blue background options',
          style: 'standard ID photography',
          background: 'red, blue, or white solid color',
          requirements: 'front facing, no hat, standard ID photo format'
        },
        prompt_list: [
          'Standard ID photo, bright red background, front facing portrait, neutral expression, formal attire, sharp focus, official ID standard',
          'Standard ID photo, sky blue background, front facing portrait, neutral expression, formal attire, sharp focus, official ID standard'
        ],
        price_credits: 6,
        is_active: true,
        sort_order: 117,
      },
    ];

    // AI 动漫头像 (anime) - 新增变体
    const animeTemplates = [
      {
        name: '水彩插画风格',
        description: '水彩画风格动漫头像,柔和色彩与手绘质感,艺术感十足',
        category: 'style',
        domain: 'anime',
        preview_image_url: 'https://images.pexels.com/photos/3394318/pexels-photo-3394318.jpeg',
        prompt_config: {
          basePrompt: 'watercolor illustration anime portrait, soft colors, hand-painted texture',
          style: 'watercolor art style',
          color: 'soft pastel watercolor tones',
          texture: 'watercolor paper texture, brush strokes visible'
        },
        prompt_list: [
          'Watercolor illustration anime portrait, soft pastel colors, hand-painted texture, delicate brush strokes, artistic watercolor style, gentle and dreamy atmosphere',
          'Anime character watercolor art, flowing colors, transparent watercolor effect, artistic illustration style, soft and beautiful'
        ],
        price_credits: 15,
        is_active: true,
        sort_order: 108,
      },
      {
        name: '蒸汽朋克风格',
        description: '蒸汽朋克主题动漫头像,维多利亚时代与机械美学融合,独特复古未来感',
        category: 'style',
        domain: 'anime',
        preview_image_url: 'https://images.pexels.com/photos/3394319/pexels-photo-3394319.jpeg',
        prompt_config: {
          basePrompt: 'steampunk anime portrait, Victorian era meets mechanical aesthetics',
          style: 'steampunk illustration',
          color: 'brass, copper, brown tones with steam effects',
          elements: 'gears, goggles, mechanical parts, steam'
        },
        prompt_list: [
          'Steampunk anime portrait, Victorian costume with mechanical accessories, brass and copper tones, gears and goggles, steam effects, retro-futuristic atmosphere',
          'Steampunk character illustration, mechanical aesthetic, Victorian era fashion, industrial elements, warm sepia tones with metallic accents'
        ],
        price_credits: 15,
        is_active: true,
        sort_order: 109,
      },
      {
        name: '魔幻奇幻风格',
        description: '西方奇幻风格动漫头像,精灵、魔法师等奇幻角色,充满魔幻色彩',
        category: 'style',
        domain: 'anime',
        preview_image_url: 'https://images.pexels.com/photos/3394320/pexels-photo-3394320.jpeg',
        prompt_config: {
          basePrompt: 'fantasy anime portrait, elf or mage character, magical elements',
          style: 'western fantasy illustration',
          color: 'magical glowing colors, ethereal tones',
          elements: 'magic effects, fantasy costume, mystical atmosphere'
        },
        prompt_list: [
          'Fantasy anime portrait, elf character with pointed ears, magical costume, glowing magical effects, ethereal atmosphere, western fantasy illustration style',
          'Anime mage character, fantasy robes, magical staff, mystical glowing effects, enchanted background, high fantasy illustration'
        ],
        price_credits: 15,
        is_active: true,
        sort_order: 110,
      },
      {
        name: '像素艺术升级版',
        description: '高清像素艺术风格动漫头像,复古游戏美学与现代色彩的完美结合',
        category: 'style',
        domain: 'anime',
        preview_image_url: 'https://images.pexels.com/photos/3394321/pexels-photo-3394321.jpeg',
        prompt_config: {
          basePrompt: 'HD pixel art anime portrait, retro game aesthetic, vibrant colors',
          style: 'pixel art illustration',
          color: 'vibrant retro game colors',
          texture: 'visible pixel grid, 16-bit or 32-bit style'
        },
        prompt_list: [
          'HD pixel art anime portrait, retro video game aesthetic, vibrant colors, visible pixel grid, 32-bit style character design, nostalgic gaming atmosphere',
          'Pixel art character portrait, colorful retro game style, detailed pixel work, classic gaming aesthetic, bright and vivid colors'
        ],
        price_credits: 12,
        is_active: true,
        sort_order: 111,
      },
    ];

    // AI 婚纱照 (wedding) - 新增变体
    const weddingTemplates = [
      {
        name: '日式和风婚纱照',
        description: '日本和服婚礼风格,樱花与神社背景,东方含蓄之美',
        category: 'cultural',
        domain: 'wedding',
        preview_image_url: 'https://images.pexels.com/photos/3394322/pexels-photo-3394322.jpeg',
        prompt_config: {
          basePrompt: 'Japanese kimono wedding portrait, cherry blossom, shrine background',
          style: 'Japanese wedding photography',
          lighting: 'soft natural light',
          background: 'cherry blossom trees or traditional Japanese shrine'
        },
        prompt_list: [
          'Japanese kimono wedding portrait, traditional white shiromuku or colorful uchikake, cherry blossom background, soft natural lighting, elegant and serene atmosphere',
          'Japanese wedding photo, traditional kimono attire, shrine or garden setting, delicate cherry blossoms, peaceful and romantic mood'
        ],
        price_credits: 15,
        is_active: true,
        sort_order: 109,
      },
      {
        name: '海岛度假婚纱照',
        description: '热带海岛婚礼风格,碧海蓝天与白沙滩,浪漫自由的度假婚礼氛围',
        category: 'location',
        domain: 'wedding',
        preview_image_url: 'https://images.pexels.com/photos/3394323/pexels-photo-3394323.jpeg',
        prompt_config: {
          basePrompt: 'tropical island wedding portrait, beach, ocean background',
          style: 'destination wedding photography',
          lighting: 'golden hour beach lighting',
          background: 'tropical beach, turquoise ocean, palm trees'
        },
        prompt_list: [
          'Tropical beach wedding portrait, white wedding dress, turquoise ocean background, golden hour lighting, palm trees, romantic destination wedding atmosphere',
          'Island wedding photo, flowing bridal gown, pristine white sand beach, crystal clear water, warm sunset light, carefree and romantic mood'
        ],
        price_credits: 15,
        is_active: true,
        sort_order: 110,
      },
      {
        name: '森林系婚纱照',
        description: '森林自然系婚礼风格,绿意盎然与自然光线,清新脱俗的森系婚礼',
        category: 'outdoor',
        domain: 'wedding',
        preview_image_url: 'https://images.pexels.com/photos/3394324/pexels-photo-3394324.jpeg',
        prompt_config: {
          basePrompt: 'forest wedding portrait, natural greenery, dappled sunlight',
          style: 'forest wedding photography',
          lighting: 'dappled natural forest light',
          background: 'lush forest, tall trees, natural greenery'
        },
        prompt_list: [
          'Forest wedding portrait, flowing white dress, lush green forest background, dappled sunlight through trees, natural and romantic atmosphere, bohemian style',
          'Woodland wedding photo, bride and groom among tall trees, soft natural light, green foliage, fresh and pure forest wedding aesthetic'
        ],
        price_credits: 12,
        is_active: true,
        sort_order: 111,
      },
    ];

    const allNewTemplates = [
      ...portraitTemplates,
      ...childrenTemplates,
      ...idPhotoTemplates,
      ...animeTemplates,
      ...weddingTemplates,
    ];

    console.log(`准备插入 ${allNewTemplates.length} 个新模板:\n`);
    console.log(`- AI 个人写真: ${portraitTemplates.length} 个`);
    console.log(`- AI 儿童照: ${childrenTemplates.length} 个`);
    console.log(`- AI 证件照: ${idPhotoTemplates.length} 个`);
    console.log(`- AI 动漫头像: ${animeTemplates.length} 个`);
    console.log(`- AI 婚纱照: ${weddingTemplates.length} 个\n`);

    const result = await prisma.templates.createMany({
      data: allNewTemplates,
      skipDuplicates: true,
    });

    console.log(`✅ 成功插入 ${result.count} 个新模板!\n`);

    const domains = ['portrait', 'children', 'id_photo', 'anime', 'wedding'];
    for (const domain of domains) {
      const count = await prisma.templates.count({
        where: { domain, is_active: true },
      });
      console.log(`${domain}: ${count} 个活跃模板`);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedMoreTemplates();
