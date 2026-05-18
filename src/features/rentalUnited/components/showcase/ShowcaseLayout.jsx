import React from 'react';

export default function ShowcaseLayout({ header, sidebar, main, inspector }) {
  return (
    <div className="showcase-layout">
      <style>{`
        .showcase-layout { display: flex; flex-direction: column; height: 100vh; background: #FAFAFA; font-family: 'Inter', sans-serif; }
        .showcase-layout .header {
          flex-shrink: 0; height: 48px; display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; background: #fff; border-bottom: 1px solid #E0E0E0;
        }
        .showcase-layout .body { flex: 1; display: flex; min-height: 0; }
        .showcase-layout .sidebar { flex-shrink: 0; }
        .showcase-layout .center { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
        .showcase-layout .inspector { flex-shrink: 0; height: 300px; min-height: 200px; border-top: 1px solid #E0E0E0; background: #1F2937; }
      `}</style>
      {header && <header className="header">{header}</header>}
      <div className="body">
        {sidebar && <aside className="sidebar">{sidebar}</aside>}
        <main className="center">{main}</main>
      </div>
      {inspector && <div className="inspector">{inspector}</div>}
    </div>
  );
}
