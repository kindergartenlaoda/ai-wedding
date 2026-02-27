import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, User, Image as ImageIcon, Calendar } from 'lucide-react';
import { prisma } from '@/lib/prisma';

interface UserProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { id } = await params;

  const user = await prisma.users.findUnique({
    where: { id },
    select: { id: true, name: true, image: true, created_at: true },
  });

  if (!user) {
    notFound();
  }

  const generations = await prisma.generations.findMany({
    where: {
      user_id: id,
      is_shared_to_gallery: true,
      status: 'completed',
    },
    include: {
      templates: { select: { name: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 50,
  });

  const totalImages = generations.reduce(
    (acc, gen) => acc + (Array.isArray(gen.preview_images) ? (gen.preview_images as string[]).length : 0),
    0
  );

  return (
    <div className="min-h-screen bg-obsidian py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 text-pearl/60 hover:text-alabaster mb-8 transition-colors text-sm tracking-wider uppercase font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          返回画廊
        </Link>

        {/* User Info */}
        <div className="flex items-center gap-6 mb-12">
          <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center border border-white/10 overflow-hidden">
            {user.image ? (
              <Image src={user.image} alt={user.name || ''} width={80} height={80} className="object-cover" />
            ) : (
              <User className="w-8 h-8 text-gold" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-display font-medium text-alabaster tracking-wider">
              {user.name || '匿名用户'}
            </h1>
            <div className="flex items-center gap-6 mt-2 text-xs text-pearl/50 tracking-wider uppercase">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                {totalImages} 张作品
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(user.created_at).toLocaleDateString('zh-CN')} 加入
              </span>
            </div>
          </div>
        </div>

        {/* Works Grid */}
        {generations.length === 0 ? (
          <div className="py-20 text-center">
            <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 rounded-full bg-white/5 border border-white/10">
              <ImageIcon className="w-10 h-10 text-pearl/60" />
            </div>
            <h3 className="mb-2 text-xl font-medium font-display text-alabaster tracking-wider">
              暂无公开作品
            </h3>
            <p className="text-pearl/60 font-light">该用户还没有分享作品到画廊</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {generations.flatMap((gen) =>
              (Array.isArray(gen.preview_images) ? (gen.preview_images as string[]) : []).map(
                (imgSrc, imgIdx) => (
                  <div
                    key={`${gen.id}-${imgIdx}`}
                    className="group relative aspect-[3/4] overflow-hidden rounded-sm bg-black/40 border border-white/10 hover:border-gold/30 transition-all duration-500"
                  >
                    <Image
                      src={imgSrc}
                      alt={`${gen.templates?.name || '作品'} - ${imgIdx + 1}`}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <p className="text-xs text-alabaster tracking-wider font-medium line-clamp-1">
                        {gen.templates?.name || '未知模板'}
                      </p>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
