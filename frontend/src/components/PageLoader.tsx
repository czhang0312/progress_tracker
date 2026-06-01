export default function PageLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-5">
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '2.5px solid #2563EB',
              background: 'linear-gradient(135deg, #2563EB 50%, transparent 50%)',
              flexShrink: 0,
            }}
          />
          <span className="text-sm font-semibold text-neutral-800 tracking-tight">Progress Tracker</span>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce-dot" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce-dot" style={{ animationDelay: '200ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce-dot" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </div>
  );
}
