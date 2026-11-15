type Props = { label: string; filters: string[]; active: string; onSelect: (filter: string) => void };

export function GenrePills({ label, filters, active, onSelect }: Props) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar flex items-center gap-2 overflow-x-auto py-0.5">
      {filters.map((filter) => (
        <button
          key={filter}
          type="button"
          role="tab"
          aria-selected={active === filter}
          onClick={() => onSelect(filter)}
          className={
            'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12px] transition-all duration-200 ' +
            (active === filter
              ? 'border-transparent fs-h-grad-bg font-semibold text-black shadow-sm shadow-pink-500/20'
              : 'border-white/10 bg-[#13131c] text-zinc-400 hover:border-white/20 hover:text-zinc-200')
          }
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
