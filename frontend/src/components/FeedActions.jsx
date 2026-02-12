import { Icon } from "./Icon";

export function ActionButton({ path, value, label }) {
  return (
    <button type="button" className="action-btn cursor-pointer" aria-label={label}>
      <Icon path={path} className="icon action-icon" />
      <span>{value}</span>
    </button>
  );
}

export function NavIcon({ path, label, active = false, onClick }) {
  return (
    <button className={`nav-item cursor-pointer ${active ? "active" : ""}`} type="button" aria-label={label} onClick={onClick}>
      <Icon path={path} className="icon" />
      <span>{label}</span>
    </button>
  );
}
