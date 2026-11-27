p = 'app/dashboard/ManagerDashboard.tsx'
s = open(p, encoding='utf-8').read()
DASH = '—'

def swap(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:70])
    s = s.replace(old, new)

swap("function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {\n"
     "  return (\n"
     "    <div className=\"bg-cream rounded-2xl p-4 flex flex-col gap-2 shadow-sm\">\n"
     "      <div className=\"text-orange\">{icon}</div>\n"
     "      <p className=\"text-2xl font-heading text-brown\">{value}</p>\n"
     "      <p className=\"text-xs text-brown-light font-body\">{label}</p>\n"
     "    </div>\n"
     "  )\n"
     "}\n",
     "function StatCard({\n  icon, label, value, href, onClick,\n}: {\n  icon: React.ReactNode\n  label: string\n  value: string | number\n  href?: string\n  onClick?: () => void\n}) {\n"
     "  const base = 'bg-cream rounded-2xl p-4 flex flex-col gap-2 shadow-sm text-left'\n"
     "  const inner = (\n"
     "    <>\n"
     "      <div className=\"flex items-start justify-between\">\n"
     "        <div className=\"text-orange\">{icon}</div>\n"
     "        {(href || onClick) && (\n"
     "          <span aria-hidden className=\"text-brown-light opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition duration-200 motion-reduce:transition-none\">→</span>\n"
     "        )}\n"
     "      </div>\n"
     "      <p className=\"text-2xl font-heading text-brown\">{value}</p>\n"
     "      <p className=\"text-xs text-brown-light font-body\">{label}</p>\n"
     "    </>\n"
     "  )\n"
     "  if (!href && !onClick) return <div className={base}>{inner}</div>\n"
     "  const cls = base + ' group cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100'\n"
     "  return href ? (\n"
     "    <a href={href} className={cls}>{inner}</a>\n"
     "  ) : (\n"
     "    <button type=\"button\" onClick={onClick} className={cls}>{inner}</button>\n"
     "  )\n"
     "}\n")

swap("  const [printAll, setPrintAll] = useState(false)\n",
     "  const [printAll, setPrintAll] = useState(false)\n\n"
     "  function goToTab(t: string) {\n    setTab(t)\n    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })\n  }\n\n"
     "  function feedbackLink(opts: { cat?: string; group?: string } = {}) {\n"
     "    const p = new URLSearchParams()\n"
     "    if (branchFilter !== 'all') p.set('branch', branchFilter)\n"
     "    if (outletFilter !== 'all') p.set('outlet', outletFilter)\n"
     "    const g = opts.group ?? groupFilter\n"
     "    if (g && g !== 'all') p.set('group', g)\n"
     "    if (startDate) p.set('from', startDate)\n"
     "    if (endDate) p.set('to', endDate)\n"
     "    if (opts.cat) p.set('cat', opts.cat)\n"
     "    const q = p.toString()\n"
     "    return '/dashboard/feedback' + (q ? '?' + q : '')\n  }\n")

swap("label=\"Total Feedback\" value={stats.totalCount} />",
     "label=\"Total Feedback\" value={stats.totalCount} href={feedbackLink()} />")
swap("label=\"Overall Avg\" value={stats.avgOverall || '" + DASH + "'} />",
     "label=\"Overall Avg\" value={stats.avgOverall || '" + DASH + "'} onClick={() => goToTab('trends')} />")
swap("                value={stats.nps.score ?? '" + DASH + "'}\n",
     "                value={stats.nps.score ?? '" + DASH + "'}\n                onClick={() => goToTab('trends')}\n")
swap("                value={stats.csat.percent != null ? `${stats.csat.percent}%` : '" + DASH + "'}\n",
     "                value={stats.csat.percent != null ? `${stats.csat.percent}%` : '" + DASH + "'}\n                onClick={() => goToTab('trends')}\n")
swap("label=\"Repeat Guests\" value={stats.repeatGuestCount} />",
     "label=\"Repeat Guests\" value={stats.repeatGuestCount} onClick={() => goToTab('people')} />")
swap("value={stats.avgHostess || '" + DASH + "'} />",
     "value={stats.avgHostess || '" + DASH + "'} href={feedbackLink({ cat: 'hostess' })} />")
swap("value={stats.avgWifi || '" + DASH + "'} />",
     "value={stats.avgWifi || '" + DASH + "'} href={feedbackLink({ cat: 'wifi' })} />")
swap("                value={stats.avgAmbianceCleanliness || '" + DASH + "'}\n",
     "                value={stats.avgAmbianceCleanliness || '" + DASH + "'}\n                href={feedbackLink({ cat: 'ambiance' })}\n")
swap("<td className=\"py-2 font-semibold\">{g.name}</td>",
     "<td className=\"py-2 font-semibold\">\n"
     "                            <a href={feedbackLink({ group: g.name })} className=\"underline decoration-dotted hover:text-orange transition\">{g.name}</a>\n"
     "                          </td>")

ROW = " className=\"flex justify-between text-sm font-body\">"
for key, setter, typ in (("b.branch", "setBranchFilter", "branchFilter"), ("o.outlet", "setOutletFilter", "outletFilter")):
    old = "<div key={" + key + "}" + ROW
    assert s.count(old) == 1, (key, s.count(old))
    i = s.index(old)
    j = s.index("</div>", i)
    v = key
    new = ("<button\n                        type=\"button\"\n                        key={" + key + "}\n"
           "                        title=\"Filter the dashboard to this one\"\n"
           "                        onClick={() => " + setter + "(" + v + " as typeof " + typ + ")}\n"
           "                        className=\"flex justify-between w-full text-left text-sm font-body rounded px-1 -mx-1 hover:bg-cream/10 active:scale-[0.99] transition\">")
    s = s[:i] + new + s[i + len(old):j - 0] + "</button>" + s[j + len("</div>"):]
open(p, 'w', encoding='utf-8').write(s)
print('clickable cards OK')
