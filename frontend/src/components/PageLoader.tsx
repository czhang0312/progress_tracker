import { LogoMark } from '@/components/ProgressCircle';

export default function PageLoader() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-5">
          <LogoMark size={20} />
          <span className="text-sm font-semibold text-ink tracking-tight">Progress Tracker</span>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce-dot" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce-dot" style={{ animationDelay: '200ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce-dot" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </div>
  );
}
