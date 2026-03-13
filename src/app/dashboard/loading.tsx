export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-white/20 animate-pulse" />
              <div className="w-32 h-6 rounded bg-white/20 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-20 h-4 rounded bg-white/20 animate-pulse hidden sm:block" />
              <div className="w-9 h-9 rounded-full bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" aria-busy="true" aria-label="読み込み中">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse" />
                <div className="space-y-2">
                  <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
                  <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Title + button skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-32 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="w-28 h-10 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* Filter skeleton */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 max-w-md h-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="w-32 h-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="w-32 h-10 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* Table skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm" aria-label="経費一覧読み込み中">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["件名", "利用日", "カテゴリ", "金額", "ステータス", "申請者", "領収書", "操作"].map(
                  (label) => (
                    <th key={label} className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                      {label}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-4 py-3"><div className="w-32 h-4 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="w-24 h-4 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="w-16 h-5 bg-gray-200 rounded-full animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="w-20 h-4 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="w-16 h-5 bg-gray-200 rounded-full animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="w-20 h-4 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="w-10 h-4 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="w-20 h-6 bg-gray-200 rounded animate-pulse" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
