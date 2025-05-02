interface PanelProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  headerContent?: React.ReactNode;
  maxHeight?: string;
}

export function Panel({
  children,
  icon,
  headerContent,
  maxHeight,
}: PanelProps) {
  return (
    <div className="bg-[#020617]/80 flex flex-col" style={{ maxHeight }}>
      {(icon || headerContent) && (
        <div className="flex items-center justify-between p-1 shrink-0">
          {icon && <div className="text-emerald-400/80">{icon}</div>}
          {headerContent}
        </div>
      )}
      <div className="px-4 pb-4">
        <style jsx={true}>{`
          div::-webkit-scrollbar {
            width: var(--scrollbar-width);
          }
          div::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
          }
          div::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }
        `}</style>
        {children}
      </div>
    </div>
  );
}
