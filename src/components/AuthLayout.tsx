import { LogoMark } from "./Logo";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="brand-gradient flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <LogoMark className="mx-auto h-16 w-20" />
          <div className="mt-2 font-display text-3xl brand-text">SPORTX</div>
          <div className="text-[10px] font-semibold tracking-[0.25em] text-brand-purple">PORTA IN ORBITA LO SPORT</div>
          <h1 className="mt-5 text-lg font-bold text-slate-800">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
