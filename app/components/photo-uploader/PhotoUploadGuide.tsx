import { Camera, ArrowRight } from 'lucide-react';

interface PhotoUploadGuideProps {
  minPhotos: number;
  onOpenGuideModal: () => void;
}

export function PhotoUploadGuide({ minPhotos, onOpenGuideModal }: PhotoUploadGuideProps) {
  return (
    <div className="mb-6 p-5 bg-white/5 border border-white/10 rounded-sm shadow-inner backdrop-blur-sm">
      <h4 className="font-display font-medium text-alabaster tracking-wider mb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-sm bg-black/40 border border-white/5 flex items-center justify-center">
          <Camera className="w-4 h-4 text-gold opacity-80" />
        </div>
        上传照片小贴士
      </h4>
      <ol className="space-y-3 text-sm text-pearl/60 font-light list-decimal list-inside mb-5 tracking-wide leading-relaxed ml-2 marker:text-gold/50">
        <li>至少上传 {minPhotos} 张不同角度的清晰照片</li>
        <li>确保光线充足，避免阴影遮挡面部</li>
        <li>不要佩戴墨镜、口罩等遮挡物</li>
        <li>包含正面、侧面、微笑等多种表情</li>
      </ol>
      <button
        type="button"
        onClick={onOpenGuideModal}
        className="text-gold hover:text-gold/80 font-medium tracking-widest text-xs uppercase flex items-center gap-2 transition-colors group ml-2"
      >
        查看优质照片示例 <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
