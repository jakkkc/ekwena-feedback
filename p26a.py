def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for old, new in pairs:
        assert s.count(old) == 1, (p, s.count(old), old[:70])
        s = s.replace(old, new)
    open(p, 'w', encoding='utf-8').write(s)

patch('app/dashboard/feedback/FeedbackTable.tsx', [
    ("function ratingsOf(r: Row) {\n",
     "const CATEGORY_FILTERS: Record<string, { label: string; get: (r: Row) => (number | null)[] }> = {\n"
     "  hostess: { label: 'Hostess Reception', get: (r) => [r.hostess_rating] },\n"
     "  wifi: { label: 'Wifi Connectivity', get: (r) => [r.wifi_rating] },\n"
     "  ambiance: { label: 'Ambiance & Cleanliness', get: (r) => [r.ambiance_rating, r.cleanliness_rating] },\n"
     "}\n\nfunction ratingsOf(r: Row) {\n"),
    ("  const [busyId, setBusyId] = useState('')\n",
     "  const [busyId, setBusyId] = useState('')\n  const [cat, setCat] = useState('')\n"),
    ("  useEffect(() => {\n    load()\n  }, [load])\n",
     "  useEffect(() => {\n    load()\n  }, [load])\n\n"
     "  // Filters can arrive in the link, e.g. from a dashboard card\n"
     "  useEffect(() => {\n"
     "    try {\n"
     "      const p = new URLSearchParams(window.location.search)\n"
     "      const br = p.get('branch')\n      if (br) setBranch(br)\n"
     "      const ou = p.get('outlet')\n      if (ou) setOutlet(ou)\n"
     "      const gr = p.get('group')\n      if (gr) setGroup(gr)\n"
     "      const st = p.get('status')\n      if (st === 'open' || st === 'resolved' || st === 'ok') setStatus(st)\n"
     "      const f = p.get('from')\n      if (f) setFrom(f)\n"
     "      const t = p.get('to')\n      if (t) setTo(t)\n"
     "      const c = p.get('cat')\n      if (c && CATEGORY_FILTERS[c]) setCat(c)\n"
     "    } catch {}\n"
     "  }, [])\n"),
    ("      if (status !== 'all' && statusOf(r) !== status) return false\n",
     "      if (status !== 'all' && statusOf(r) !== status) return false\n"
     "      if (cat && !CATEGORY_FILTERS[cat].get(r).some((v) => v != null && v <= 2)) return false\n"),
    ("  }, [rows, search, branch, outlet, group, source, status, from, to, sortKey, sortDir])\n",
     "  }, [rows, search, branch, outlet, group, source, status, cat, from, to, sortKey, sortDir])\n"),
    ("            {loading ? 'Loading...' : `${filtered.length} of ${rows.length} responses`}\n          </p>\n",
     "            {loading ? 'Loading...' : `${filtered.length} of ${rows.length} responses`}\n          </p>\n"
     "          {cat && CATEGORY_FILTERS[cat] && (\n"
     "            <button\n              type=\"button\"\n              onClick={() => { setCat(''); setPage(1) }}\n"
     "              className=\"mt-2 inline-flex items-center gap-1.5 bg-orange/10 border border-orange text-brown rounded-full px-3 py-1 text-xs font-body hover:bg-orange/20 transition\"\n            >\n"
     "              Filtered by: {CATEGORY_FILTERS[cat].label} · low ratings (1-2) <span aria-hidden>✕</span>\n"
     "            </button>\n          )}\n"),
])

patch('app/dashboard/DashboardNav.tsx', [
    ("                    aria-label={`${count} need attention`}\n",
     "                    aria-label={`${count} need attention`}\n"
     "                    role=\"link\"\n"
     "                    onClick={(e) => {\n                      e.preventDefault()\n                      e.stopPropagation()\n"
     "                      router.push('/dashboard/feedback?status=open')\n                    }}\n"),
    ("                    className=\"min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white",
     "                    className=\"cursor-pointer hover:bg-red-700 transition min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white"),
])
print('feedback filters + badge OK')
