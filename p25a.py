def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for old, new in pairs:
        assert s.count(old) == 1, (p, s.count(old), old[:70])
        s = s.replace(old, new)
    open(p, 'w', encoding='utf-8').write(s)

patch('app/dashboard/Tabs.tsx', [
    ("  tabs: { key: string; label: string }[]\n",
     "  tabs: { key: string; label: string; short?: string }[]\n"),
    ("          {t.label}\n",
     "          <span className=\"sm:hidden\">{t.short ?? t.label}</span>\n"
     "          <span className=\"hidden sm:inline\">{t.label}</span>\n"),
])

patch('app/dashboard/DashboardNav.tsx', [
    ("    await fetch('/api/auth/logout', { method: 'POST' })\n",
     "    try { localStorage.removeItem('dash_state_v1') } catch {}\n    await fetch('/api/auth/logout', { method: 'POST' })\n"),
])

patch('app/dashboard/ManagerDashboard.tsx', [
    ("import { ResolveButton, ResolvedList, type ResolvedItem } from './ResolveControls'\n",
     "import { ResolveButton, ResolvedList, type ResolvedItem } from './ResolveControls'\nimport { Tabs } from './Tabs'\n"),
    ("  groupOptions: string[]\n}\n",
     "  groupOptions: string[]\n  needsAttentionCount: number\n}\n"),
    ("  const [groupFilter, setGroupFilter] = useState('all')\n",
     "  const [groupFilter, setGroupFilter] = useState('all')\n"
     "  const [tab, setTab] = useState('overview')\n"
     "  const [restored, setRestored] = useState(false)\n"
     "  const [printAll, setPrintAll] = useState(false)\n"),
    ("  useEffect(() => {\n    loadStats()\n  }, [loadStats])\n",
     "  useEffect(() => {\n"
     "    try {\n"
     "      const raw = localStorage.getItem('dash_state_v1')\n"
     "      if (raw) {\n"
     "        const v = JSON.parse(raw)\n"
     "        if (v.branch === 'all' || v.branch === 'cottages' || v.branch === 'tuuti') setBranchFilter(v.branch)\n"
     "        if (typeof v.outlet === 'string') setOutletFilter(v.outlet)\n"
     "        if (typeof v.group === 'string') setGroupFilter(v.group)\n"
     "        if (typeof v.start === 'string') setStartDate(v.start)\n"
     "        if (typeof v.end === 'string') setEndDate(v.end)\n"
     "        if (['overview', 'trends', 'people', 'groups', 'comments'].includes(v.tab)) setTab(v.tab)\n"
     "      }\n"
     "    } catch {}\n"
     "    setRestored(true)\n"
     "  }, [])\n\n"
     "  useEffect(() => {\n"
     "    if (!restored) return\n"
     "    try {\n"
     "      localStorage.setItem('dash_state_v1', JSON.stringify({\n"
     "        tab, branch: branchFilter, outlet: outletFilter, group: groupFilter, start: startDate, end: endDate,\n"
     "      }))\n"
     "    } catch {}\n"
     "  }, [restored, tab, branchFilter, outletFilter, groupFilter, startDate, endDate])\n\n"
     "  useEffect(() => {\n"
     "    if (!restored) return\n"
     "    loadStats()\n"
     "  }, [loadStats, restored])\n"),
    ("setGeneratingReport(true)\n",
     "setGeneratingReport(true)\n    // Show every tab for a moment so the charts can be captured for the PDF\n"
     "    setPrintAll(true)\n    await new Promise((r) => setTimeout(r, 900))\n"),
    ("      setGeneratingReport(false)\n",
     "      setGeneratingReport(false)\n      setPrintAll(false)\n"),
])
print('tabs setup OK')
