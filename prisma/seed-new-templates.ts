import 'dotenv/config';
import { PrismaClient, Prisma } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

interface TemplateData {
  name: string;
  description: string;
  category: string;
  domain: string;
  preview_image_url: string;
  prompt_config: Prisma.InputJsonValue;
  prompt_list: string[];
  price_credits: number;
  is_active: boolean;
  sort_order: number;
}

const maternityTemplates: TemplateData[] = [
  {
    name: '温馨孕妇照',
    description: '室内温馨风格孕妇写真',
    category: 'indoor',
    domain: 'maternity',
    preview_image_url:
      'https://images.pexels.com/photos/1556652/pexels-photo-1556652.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'maternity photography' },
    prompt_list: [
      'A beautiful pregnant woman in a flowing white dress, standing by a window with soft natural light, gentle smile, serene atmosphere, professional maternity photography',
      'Elegant maternity portrait, expectant mother in a cream-colored gown, cradling her belly, warm studio lighting, soft focus background, intimate and peaceful mood',
      'Outdoor maternity photoshoot, pregnant woman in a floral dress walking in a garden, golden hour lighting, natural and joyful expression, dreamy bokeh effect',
      'Artistic maternity photo, silhouette of a pregnant woman against a sunset sky, dramatic lighting, emotional and powerful composition',
      'Cozy indoor maternity session, expectant mother sitting on a bed with soft pillows, wearing a knit sweater, warm and comfortable atmosphere, natural light from window',
    ],
    price_credits: 12,
    is_active: true,
    sort_order: 1,
  },
  {
    name: '户外孕妇写真',
    description: '自然光线户外孕妇照',
    category: 'outdoor',
    domain: 'maternity',
    preview_image_url:
      'https://images.pexels.com/photos/1556691/pexels-photo-1556691.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'outdoor maternity photography' },
    prompt_list: [
      'Pregnant woman in a flowing maxi dress standing in a field of wildflowers, gentle breeze, golden hour sunlight, peaceful and natural atmosphere, professional outdoor maternity photo',
      'Expectant mother walking barefoot on a beach at sunset, white linen dress, waves in background, romantic and serene mood, soft warm lighting',
      'Maternity photoshoot in a park, pregnant woman under a large tree, dappled sunlight, green foliage background, natural and relaxed pose',
      'Beautiful pregnant woman in a garden setting, surrounded by blooming flowers, soft pastel colors, dreamy and ethereal atmosphere, spring vibes',
      'Outdoor maternity portrait, expectant mother in a forest clearing, natural light filtering through trees, earthy tones, connection with nature theme',
    ],
    price_credits: 12,
    is_active: true,
    sort_order: 2,
  },
  {
    name: '艺术孕妇照',
    description: '创意艺术风格孕妇摄影',
    category: 'artistic',
    domain: 'maternity',
    preview_image_url:
      'https://images.pexels.com/photos/1556707/pexels-photo-1556707.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'artistic maternity photography' },
    prompt_list: [
      'Black and white artistic maternity portrait, pregnant woman in profile, dramatic side lighting, minimalist composition, elegant and timeless',
      'Creative maternity photo with fabric flowing around pregnant woman, dynamic movement, studio setting, artistic and fashion-forward style',
      'Silhouette of pregnant woman against colorful sunset sky, dramatic backlighting, artistic composition, emotional and powerful image',
      'Fine art maternity portrait, expectant mother in vintage lace dress, soft focus, muted colors, painterly quality, romantic and dreamy',
      'Contemporary maternity photo, pregnant woman in modern minimalist setting, clean lines, neutral tones, sophisticated and artistic approach',
    ],
    price_credits: 15,
    is_active: true,
    sort_order: 3,
  },
  {
    name: '情侣孕妇照',
    description: '准爸妈温馨合照',
    category: 'couple',
    domain: 'maternity',
    preview_image_url:
      'https://images.pexels.com/photos/1556704/pexels-photo-1556704.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'couple maternity photography' },
    prompt_list: [
      'Expecting couple embracing, man gently holding pregnant woman from behind, both hands on belly, soft natural light, intimate and loving atmosphere',
      'Maternity couple photoshoot outdoors, walking hand in hand in a park, golden hour lighting, casual and relaxed poses, joyful expressions',
      'Studio portrait of expecting parents, face to face, foreheads touching, hands together on belly, romantic and tender moment, soft lighting',
      'Couple maternity photo at home, sitting together on couch, pregnant woman leaning on partner, cozy and comfortable setting, natural light',
      'Outdoor couple maternity session, expecting parents kissing with sunset in background, silhouette style, romantic and emotional composition',
    ],
    price_credits: 12,
    is_active: true,
    sort_order: 4,
  },
  {
    name: '时尚孕妇照',
    description: '时尚杂志风格孕妇写真',
    category: 'fashion',
    domain: 'maternity',
    preview_image_url:
      'https://images.pexels.com/photos/1556710/pexels-photo-1556710.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'fashion maternity photography' },
    prompt_list: [
      'High fashion maternity portrait, pregnant woman in elegant designer dress, professional studio lighting, magazine editorial style, sophisticated and glamorous',
      'Fashion-forward maternity photo, expectant mother in stylish outfit, urban background, confident pose, modern and chic aesthetic',
      'Glamorous maternity photoshoot, pregnant woman in flowing gown, dramatic lighting, fashion photography style, elegant and striking',
      'Contemporary fashion maternity portrait, minimalist styling, clean background, professional makeup and hair, high-end editorial look',
      'Stylish maternity photo, pregnant woman in trendy maternity wear, natural light studio, fashion magazine quality, polished and professional',
    ],
    price_credits: 15,
    is_active: true,
    sort_order: 5,
  },
  {
    name: '居家孕妇照',
    description: '温馨居家生活孕妇照',
    category: 'lifestyle',
    domain: 'maternity',
    preview_image_url:
      'https://images.pexels.com/photos/1556688/pexels-photo-1556688.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'lifestyle maternity photography' },
    prompt_list: [
      'Lifestyle maternity photo at home, pregnant woman in comfortable clothing, sitting in nursery, natural window light, intimate and personal atmosphere',
      'Casual home maternity session, expectant mother preparing baby clothes, soft natural lighting, candid and authentic moments',
      'Cozy maternity photo, pregnant woman reading in a comfortable chair, warm home setting, natural light, peaceful and relaxed mood',
      'Home lifestyle maternity portrait, expectant mother in kitchen or living room, everyday moments, natural and unposed style',
      'Indoor maternity photo, pregnant woman by window with morning light, wearing cozy sweater, intimate and genuine atmosphere, documentary style',
    ],
    price_credits: 10,
    is_active: true,
    sort_order: 6,
  },
];

const graduationTemplates: TemplateData[] = [
  {
    name: '经典学士服',
    description: '传统学士服毕业照',
    category: 'classic',
    domain: 'graduation',
    preview_image_url:
      'https://images.pexels.com/photos/267885/pexels-photo-267885.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'graduation photography' },
    prompt_list: [
      'Graduate in traditional black cap and gown, holding diploma, standing in front of university building, proud smile, professional graduation portrait',
      'Classic graduation photo, student in academic regalia, mortarboard cap, formal pose on campus, bright sunny day, celebratory atmosphere',
      'Formal graduation portrait, graduate in black gown and cap, university architecture background, confident expression, traditional ceremony style',
      'Graduate throwing cap in the air, black gown flowing, campus quad background, joyful celebration moment, dynamic action shot',
      'Professional graduation photo, student in full academic dress, library or academic building backdrop, serious and accomplished expression',
    ],
    price_credits: 10,
    is_active: true,
    sort_order: 1,
  },
  {
    name: '校园毕业照',
    description: '校园标志性建筑毕业照',
    category: 'campus',
    domain: 'graduation',
    preview_image_url:
      'https://images.pexels.com/photos/1205651/pexels-photo-1205651.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'campus graduation photography' },
    prompt_list: [
      'Graduate posing in front of iconic campus gate or entrance, wearing cap and gown, holding diploma, sunny day, memorable location',
      'Graduation photo on university campus lawn, student in academic regalia, historic buildings in background, natural outdoor lighting',
      'Campus graduation portrait, graduate sitting on steps of main building, casual pose with cap and gown, relaxed and happy expression',
      'Student in graduation attire walking through campus archway, architectural details, natural light, symbolic transition moment',
      'Graduation photo at campus landmark, student in cap and gown, university sign or statue visible, proud and accomplished mood',
    ],
    price_credits: 10,
    is_active: true,
    sort_order: 2,
  },
  {
    name: '图书馆毕业照',
    description: '图书馆学术氛围毕业照',
    category: 'indoor',
    domain: 'graduation',
    preview_image_url:
      'https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'library graduation photography' },
    prompt_list: [
      'Graduate in cap and gown standing in university library, surrounded by bookshelves, holding diploma, academic and scholarly atmosphere',
      'Graduation portrait in library reading room, student in academic regalia, natural light from windows, intellectual and contemplative mood',
      'Graduate sitting at library desk with books, wearing cap and gown, studying pose, symbolic of academic journey completion',
      'Library graduation photo, student in academic dress among tall bookshelves, dramatic lighting, sophisticated and scholarly setting',
      'Indoor graduation portrait in historic library, graduate in traditional regalia, architectural details, elegant and timeless composition',
    ],
    price_credits: 12,
    is_active: true,
    sort_order: 3,
  },
  {
    name: '活力毕业照',
    description: '青春活力毕业纪念照',
    category: 'dynamic',
    domain: 'graduation',
    preview_image_url:
      'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'dynamic graduation photography' },
    prompt_list: [
      'Graduate jumping in the air with joy, cap and gown flowing, campus background, energetic and celebratory moment, bright sunny day',
      'Group of graduates throwing caps in the air together, dynamic action shot, blue sky background, joyful celebration, friendship and achievement',
      'Graduate running or walking confidently in cap and gown, motion blur effect, campus pathway, energetic and forward-looking mood',
      'Playful graduation photo, student doing fun pose in academic regalia, casual and relaxed atmosphere, personality shining through',
      'Dynamic graduation portrait, graduate with arms raised in victory, cap and gown, excited expression, celebration of accomplishment',
    ],
    price_credits: 12,
    is_active: true,
    sort_order: 4,
  },
  {
    name: '文艺毕业照',
    description: '文艺清新毕业写真',
    category: 'artistic',
    domain: 'graduation',
    preview_image_url:
      'https://images.pexels.com/photos/1462630/pexels-photo-1462630.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'artistic graduation photography' },
    prompt_list: [
      'Artistic graduation portrait, soft focus, graduate in cap and gown with flowers, dreamy and romantic atmosphere, pastel colors',
      'Creative graduation photo, student in academic regalia, artistic composition with natural elements, soft lighting, poetic mood',
      'Graduation portrait with bokeh effect, graduate holding diploma, blurred background, artistic and elegant style, warm tones',
      'Fine art graduation photo, black and white or muted colors, graduate in contemplative pose, artistic and timeless quality',
      'Artistic outdoor graduation session, graduate in cap and gown among trees or flowers, natural light, ethereal and beautiful composition',
    ],
    price_credits: 15,
    is_active: true,
    sort_order: 5,
  },
  {
    name: '怀旧毕业照',
    description: '复古怀旧风格毕业照',
    category: 'vintage',
    domain: 'graduation',
    preview_image_url:
      'https://images.pexels.com/photos/1153213/pexels-photo-1153213.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'vintage graduation photography' },
    prompt_list: [
      'Vintage style graduation photo, sepia or faded color tones, graduate in classic cap and gown, nostalgic and timeless atmosphere',
      'Retro graduation portrait, film photography aesthetic, graduate with diploma, old campus buildings, nostalgic mood',
      'Classic vintage graduation photo, black and white, traditional pose, historic university setting, timeless and elegant',
      'Graduation photo with vintage filter, graduate in academic regalia, old-fashioned composition, sentimental and memorable feel',
      'Nostalgic graduation portrait, muted colors, graduate on campus, reminiscent of old yearbook photos, classic and enduring style',
    ],
    price_credits: 12,
    is_active: true,
    sort_order: 6,
  },
];

const coupleTemplates: TemplateData[] = [
  {
    name: '浪漫情侣照',
    description: '浪漫甜蜜情侣写真',
    category: 'romantic',
    domain: 'couple',
    preview_image_url:
      'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'romantic couple photography' },
    prompt_list: [
      'Romantic couple embracing at sunset, golden hour lighting, silhouette against colorful sky, intimate and loving atmosphere, dreamy mood',
      'Couple kissing in a beautiful outdoor setting, soft natural light, flowers or nature background, tender and romantic moment',
      'Loving couple holding hands and walking together, scenic background, warm lighting, natural and affectionate poses, connection and intimacy',
      'Romantic portrait of couple face to face, foreheads touching, soft focus, warm tones, emotional and intimate composition',
      'Couple in romantic embrace, beautiful landscape background, sunset or golden hour, passionate and loving atmosphere, cinematic quality',
    ],
    price_credits: 12,
    is_active: true,
    sort_order: 1,
  },
  {
    name: '约会情侣照',
    description: '日常约会场景情侣照',
    category: 'lifestyle',
    domain: 'couple',
    preview_image_url:
      'https://images.pexels.com/photos/1024992/pexels-photo-1024992.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'lifestyle couple photography' },
    prompt_list: [
      'Couple on a date at a cafe, sitting together, laughing and talking, natural candid moment, warm and cozy atmosphere',
      'Lifestyle couple photo, walking in the city, holding hands, casual clothing, urban background, relaxed and happy expressions',
      'Couple enjoying picnic in the park, sitting on blanket, natural outdoor setting, playful and fun interaction, sunny day',
      'Date night couple photo, dressed up, romantic restaurant or city lights background, elegant and sophisticated mood',
      'Casual couple portrait, at home or everyday setting, natural poses, genuine smiles, comfortable and authentic atmosphere',
    ],
    price_credits: 10,
    is_active: true,
    sort_order: 2,
  },
  {
    name: '旅行情侣照',
    description: '旅行纪念情侣合照',
    category: 'travel',
    domain: 'couple',
    preview_image_url:
      'https://images.pexels.com/photos/1024998/pexels-photo-1024998.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'travel couple photography' },
    prompt_list: [
      'Couple traveling together, scenic destination background, mountains or beach, adventurous and joyful mood, vacation vibes',
      'Travel couple photo at famous landmark, holding hands, tourist destination, happy and excited expressions, memorable moment',
      'Couple on beach vacation, walking along shoreline, sunset lighting, relaxed and romantic atmosphere, tropical paradise',
      'Adventure couple portrait, hiking or exploring nature, outdoor setting, active and energetic poses, connection with nature',
      'Couple at scenic viewpoint, embracing with beautiful landscape behind, travel photography style, romantic and inspiring',
    ],
    price_credits: 12,
    is_active: true,
    sort_order: 3,
  },
  {
    name: '文艺情侣照',
    description: '文艺清新情侣写真',
    category: 'artistic',
    domain: 'couple',
    preview_image_url:
      'https://images.pexels.com/photos/1024996/pexels-photo-1024996.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'artistic couple photography' },
    prompt_list: [
      'Artistic couple portrait, soft focus and dreamy atmosphere, natural light, romantic and poetic mood, pastel colors',
      'Creative couple photo with interesting composition, artistic angles, unique perspective, sophisticated and elegant style',
      'Fine art couple portrait, black and white or muted tones, emotional and intimate, gallery-worthy quality',
      'Artistic outdoor couple session, natural elements, soft lighting, ethereal and beautiful composition, romantic aesthetic',
      'Contemporary artistic couple photo, minimalist style, clean composition, modern and sophisticated approach',
    ],
    price_credits: 15,
    is_active: true,
    sort_order: 4,
  },
  {
    name: '活力情侣照',
    description: '青春活力情侣照',
    category: 'dynamic',
    domain: 'couple',
    preview_image_url:
      'https://images.pexels.com/photos/1024995/pexels-photo-1024995.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'dynamic couple photography' },
    prompt_list: [
      'Energetic couple jumping together, holding hands in mid-air, joyful expressions, dynamic action shot, fun and playful mood',
      'Couple running or playing together, outdoor setting, motion and energy, laughing and having fun, youthful and vibrant',
      'Playful couple photo, piggyback ride or playful interaction, casual and fun atmosphere, genuine happiness and connection',
      'Active couple portrait, doing activities together, sports or outdoor adventure, energetic and lively mood',
      'Dynamic couple shot, spinning or dancing together, movement and joy, celebratory and fun atmosphere',
    ],
    price_credits: 12,
    is_active: true,
    sort_order: 5,
  },
  {
    name: '居家情侣照',
    description: '温馨居家情侣照',
    category: 'home',
    domain: 'couple',
    preview_image_url:
      'https://images.pexels.com/photos/1024997/pexels-photo-1024997.jpeg?auto=compress&cs=tinysrgb&w=800',
    prompt_config: { basePrompt: 'home couple photography' },
    prompt_list: [
      'Cozy couple photo at home, cuddling on couch, natural window light, intimate and comfortable atmosphere, relaxed poses',
      'Domestic couple portrait, cooking or doing activities together at home, candid and authentic moments, warm lighting',
      'Couple in bedroom or living room, morning light, casual clothing, intimate and personal setting, genuine connection',
      'Home lifestyle couple photo, reading or relaxing together, natural and unposed, comfortable and loving atmosphere',
      'Indoor couple portrait, cozy home setting, soft natural light, intimate and tender moments, everyday love and connection',
    ],
    price_credits: 10,
    is_active: true,
    sort_order: 6,
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const allTemplates = [
    ...maternityTemplates,
    ...graduationTemplates,
    ...coupleTemplates,
  ];

  console.log(`Seeding ${allTemplates.length} new templates...`);
  console.log(`  - Maternity: ${maternityTemplates.length} templates`);
  console.log(`  - Graduation: ${graduationTemplates.length} templates`);
  console.log(`  - Couple: ${coupleTemplates.length} templates`);

  let created = 0;

  for (const template of allTemplates) {
    await prisma.templates.create({
      data: template,
    });
    created++;
    console.log(`  [NEW] ${template.name} (${template.domain})`);
  }

  console.log(`\nDone! Created: ${created} templates`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
