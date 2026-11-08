import React from "react";
import { Outlet, NavLink } from "react-router-dom";

const navItems = [
  { to: "/overview", label: "Overview" },
  { to: "/releases", label: "Releases" },
  { to: "/projects", label: "Projects" },
  { to: "/dependencies", label: "Dependencies" },
  { to: "/risks", label: "Risks" },
  { to: "/evidence", label: "Evidence" },
  { to: "/impact", label: "Impact" },
  { to: "/assistant", label: "Assistant" },
  { to: "/integrations", label: "Integrations" },
  { to: "/activity", label: "Activity" },
  { to: "/settings", label: "Settings" },
];

export default function Shell() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 240, padding: 16, borderRight: "1px solid #dcdfe4" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <img src="./logo.svg" alt="ShipSignal logo" width={36} height={36} style={{ borderRadius: 8, flexShrink: 0 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          <div>
            <h1 style={{ fontSize: 18, margin: 0, lineHeight: 1.1 }}>ShipSignal</h1>
            <div style={{ fontSize: 11, color: "#5e6c84", letterSpacing: "0.04em" }}>RELEASE INTELLIGENCE</div>
          </div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                padding: "8px 12px",
                borderRadius: 6,
                textDecoration: "none",
                color: isActive ? "#fff" : "#172b4d",
                background: isActive ? "#315cde" : "transparent",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}