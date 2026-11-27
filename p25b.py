p = 'app/dashboard/ManagerDashboard.tsx'
s = open(p, encoding='utf-8').read()

def swap(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:70])
    s = s.replace(old, new)

BANNER = (
    "              {stats.needsAttentionCount > 0 && (\n"
    "                <button\n"
    "                  onClick={() => setTab('comments')}\n"
    "                  className=\"w-full flex items-center justify-between gap-3 bg-red-50 border border-red-300 text-red-800 rounded-2xl px-4 py-3 text-left font-body text-sm\"\n"
    "                >\n"
    "                  <span>\n"
    "                    <strong>{stats.needsAttentionCount}</strong>{' '}\n"
    "                    {stats.needsAttentionCount === 1 ? 'feedback needs' : 'feedback need'} attention\n"
    "                  </span>\n"
    "                  <span className=\"font-semibold underline whitespace-nowrap\">View</span>\n"
    "                </button>\n"
    "              )}\n")

def OPEN(name, extra=''):
    return ("            {(tab === '" + name + "' || printAll) && (\n              <>\n" + extra)

CLOSE = "              </>\n            )}\n\n"

swap("            <div className=\"grid grid-cols-2 md:grid-cols-5 gap-4\">\n",
     OPEN('overview', BANNER) + "            <div className=\"grid grid-cols-2 md:grid-cols-5 gap-4\">\n")
swap("            <div ref={ratingTrendRef} className=\"bg-cream rounded-2xl p-4 md:p-6 shadow-sm\">\n",
     CLOSE + OPEN('trends') + "            <div ref={ratingTrendRef} className=\"bg-cream rounded-2xl p-4 md:p-6 shadow-sm\">\n")

G = "            <div className=\"grid md:grid-cols-2 gap-6\">\n"
assert s.count(G) == 2, s.count(G)
i2 = s.index(G, s.index(G) + 1)
s = s[:i2] + CLOSE + OPEN('people') + s[i2:]

swap("            {(stats.groupSummary || []).length > 0 && (\n",
     CLOSE + OPEN('groups') + "            {(stats.groupSummary || []).length > 0 && (\n")
swap("            <div className=\"bg-cream rounded-2xl p-4 md:p-6 shadow-sm border-2 border-green-600/40\">\n",
     "              {(stats.groupSummary || []).length === 0 && (\n"
     "                <p className=\"text-brown-light font-body text-sm\">No group feedback for these filters.</p>\n"
     "              )}\n" + CLOSE + OPEN('comments')
     + "            <div className=\"bg-cream rounded-2xl p-4 md:p-6 shadow-sm border-2 border-green-600/40\">\n")

k = s.rindex('Guest Contact List')
start = s.rfind("            <div className=\"bg-cream rounded-2xl p-4 md:p-6 shadow-sm\">\n", 0, k)
assert start != -1
s = s[:start] + CLOSE + OPEN('people') + s[start:]
END = "          </>\n        )}\n"
idx = s.index(END, start)
s = s[:idx] + "              </>\n            )}\n" + s[idx:]

swap("        {loading || !stats ? (\n",
     "        <Tabs\n          tabs={[\n"
     "            { key: 'overview', label: 'Overview' },\n"
     "            { key: 'trends', label: 'Trends' },\n"
     "            { key: 'people', label: 'Guests & Staff', short: 'People' },\n"
     "            { key: 'groups', label: 'Groups' },\n"
     "            { key: 'comments', label: 'Comments' },\n"
     "          ]}\n          active={tab}\n          onChange={setTab}\n        />\n\n"
     "        {loading || !stats ? (\n")
open(p, 'w', encoding='utf-8').write(s)
print('tab layout OK')
