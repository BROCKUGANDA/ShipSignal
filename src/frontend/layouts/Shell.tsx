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
        <h1 style={{ fontSize: 18, margin: "0 0 16px" }}>ShipSignal</h1>
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