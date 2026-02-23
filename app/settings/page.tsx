import { AuthSettings } from "@/components/auth/AuthSettings";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-fn-muted">Profile & preferences</p>
      </header>
      <AuthSettings />
      <div className="mt-6 rounded-xl border border-fn-border bg-fn-surface p-6 text-fn-muted">
        Profile & preferences placeholder
      </div>
    </div>
  );
}
