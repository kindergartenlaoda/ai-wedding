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
    <div className="flex px-8 py-6 space-x-8 border-b border-white/10 bg-transparent">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
                relative pb-4 px-2 text-sm font-medium transition-colors duration-500 uppercase tracking-widest
                ${activeTab === tab.id
              ? 'text-gold'
              : 'text-pearl/60 hover:text-alabaster'
            }
              `}
        >
          <div className="flex gap-3 items-center">
            <span>{tab.label}</span>
            <span
              className={`
                  px-2.5 py-1 rounded-sm text-xs transition-colors duration-500
                  ${activeTab === tab.id
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'bg-white/5 text-pearl/60 border border-white/5'
                }
                `}
            >
              {tab.count}
            </span>
          </div>
          {/* 底部高亮条 */}
          {activeTab === tab.id && (
            <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-gold shadow-[0_0_15px_rgba(200,160,100,0.6)]" />
          )}
        </button>
      ))}
    </div>
  );
}
