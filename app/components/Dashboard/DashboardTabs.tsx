interface Tab {
  id: string;
  label: string;
  count: number;
}

interface DashboardTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function DashboardTabs({ tabs, activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <div className="flex px-8 py-6 space-x-6 border-b border-stone/10 bg-alabaster">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
                relative pb-4 px-2 text-sm font-medium transition-colors duration-500 uppercase tracking-widest
                ${activeTab === tab.id
              ? 'text-obsidian'
              : 'text-stone hover:text-obsidian'
            }
              `}
        >
          <div className="flex gap-3 items-center">
            <span>{tab.label}</span>
            <span
              className={`
                  px-2.5 py-1 rounded-sm text-xs transition-colors duration-500
                  ${activeTab === tab.id
                  ? 'bg-obsidian text-alabaster'
                  : 'bg-stone/5 text-stone'
                }
                `}
            >
              {tab.count}
            </span>
          </div>
          {/* 底部高亮条 */}
          {activeTab === tab.id && (
            <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-gold shadow-[0_0_10px_rgba(200,160,100,0.5)]" />
          )}
        </button>
      ))}
    </div>
  );
}
