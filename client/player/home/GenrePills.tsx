type Props = { label: string; filters: string[]; active: string; onSelect: (filter: string) => void };

export function GenrePills({ label, filters, active, onSelect }: Props) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto pb-2">
      {filters.map((filter) => (
        <button
          key={filter}
          type="button"
          role="tab"
          aria-selected={active === filter}
          onClick={() => onSelect(filter)}
          className={
            'whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors duration-200 ' +
            (active === filter
              ? 'border-transparent fs-h-grad-bg font-semibold text-black'
              : 'border-border bg-panel text-muted-foreground hover:text-foreground')
          }
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
