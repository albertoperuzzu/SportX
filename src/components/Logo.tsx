// "X" del logo SportX ricreata in SVG.
export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="70 95 970 610" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="sx-green-purple" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#036b3a" />
          <stop offset="1" stopColor="#9966ff" />
        </linearGradient>
        <linearGradient id="sx-orange" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffa200" />
          <stop offset="0.7" stopColor="#ff6b00" />
        </linearGradient>
        <linearGradient id="sx-stripe" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6b00" />
          <stop offset="1" stopColor="#9966ff" />
        </linearGradient>
        <linearGradient id="sx-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6b00" />
          <stop offset="1" stopColor="#9966ff" />
        </linearGradient>
      </defs>
      <polygon points="271,141 467,141 583,266 491,350 320,203 255,203" fill="#036b3a" />
      <polygon points="480,375 553,441 316,646 83,646" fill="url(#sx-green-purple)" />
      <polygon points="697,105 1020,105 756,343 1012,565 906,652 470,343" fill="url(#sx-orange)" />
      <polygon points="790,578 857,631 827,656 760,603" fill="url(#sx-stripe)" />
      <polygon points="760,620 825,676 811,688 745,633" fill="url(#sx-stripe)" />
      <polygon points="597,630 704,630 762,680 585,681" fill="url(#sx-base)" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className="h-9 w-12" />
      <span className="leading-none">
        <span className={`font-display text-2xl tracking-wide ${light ? "text-white" : "brand-text"}`}>SPORTX</span>
        <span className={`block text-[9px] font-semibold tracking-[0.2em] ${light ? "text-white/80" : "text-brand-purple"}`}>
          PORTA IN ORBITA LO SPORT
        </span>
      </span>
    </span>
  );
}
