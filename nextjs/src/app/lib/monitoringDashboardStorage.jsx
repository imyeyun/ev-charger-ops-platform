const KEY = "monitoring_dashboard_v1";

export function loadMonitoringDashboard() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveMonitoringDashboard(state) {
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
}

export function clearMonitoringDashboard() {
    try {
        localStorage.removeItem(KEY);
    } catch {}
}
