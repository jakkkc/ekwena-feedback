'use client'

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div role="tablist" className="flex w-full border-b border-beige">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 px-2 py-2.5 text-xs sm:text-sm font-body border-b-2 -mb-px transition ${
            active === t.key
              ? 'border-orange text-brown font-semibold'
              : 'border-transparent text-brown-light hover:text-brown'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
