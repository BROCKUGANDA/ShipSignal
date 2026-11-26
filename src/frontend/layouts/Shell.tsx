import { Outlet, NavLink } from "react-router-dom";

const navItems = [
  { to: "/overview", label: "Overview" },
  { to: "/releases", label: "Releases" },
  { to: "/risks", label: "Risk register" },
  { to: "/evidence", label: "Evidence" },
  { to: "/dependencies", label: "Dependencies" },
  { to: "/assistant", label: "Impact" },
  { to: "/integrations", label: "Integrations" },
  { to: "/activity", label: "Audit" },
];

export default function Shell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img
            src="./logo.svg"
            alt=""
            width={38}
            height={38}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <div className="brand-name">ShipSignal</div>
            <div className="brand-kicker">Evidence before release</div>
          </div>
        </div>
        <nav className="nav" aria-label="ShipSignal">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : undefined)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          Deterministic readiness.
          <br />
          AI explains. Evidence decides.
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
