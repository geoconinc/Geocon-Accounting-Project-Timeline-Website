"use client";

import { useEffect, useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { demoStore, loadDb, type AppSettings } from "@/lib/demo/localStore";
import { DEMO_USER } from "@/lib/demo/config";
import type { User } from "@/lib/types";

export function SettingsView() {
  const [profile, setProfile] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function refresh() {
    const db = loadDb();
    const me = db.users.find((u) => u.id === DEMO_USER.id) ?? db.users[0];
    setProfile(me);
    setSettings(db.settings);
  }

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("geocon-demo-change", onChange);
    return () => window.removeEventListener("geocon-demo-change", onChange);
  }, []);

  if (!profile || !settings) return <div className="p-6 text-slate-500 text-sm">Loading...</div>;

  function flash(msg: string) {
    setSaved(msg);
    setTimeout(() => setSaved(null), 2000);
  }

  function saveProfile() {
    if (!profile) return;
    demoStore.updateUserProfile(profile.id, {
      name: profile.name,
      phone: profile.phone
    });
    window.dispatchEvent(new CustomEvent("geocon-demo-change"));
    flash("Profile saved");
  }

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    if (!settings) return;
    const next = { ...settings, [key]: value };
    setSettings(next);
    demoStore.updateSettings({ [key]: value });
    window.dispatchEvent(new CustomEvent("geocon-demo-change"));
  }

  function resetAll() {
    if (!confirm("This will erase all demo data and start fresh. Continue?")) return;
    demoStore.resetDb();
    window.dispatchEvent(new CustomEvent("geocon-demo-change"));
    flash("Demo data reset");
  }

  return (
    <div className="p-6 overflow-auto h-full max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-brand-dark">Settings</h1>
        <p className="text-sm text-slate-500">Your profile and notification preferences.</p>
      </div>

      <Card title="Profile">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Display name">
            <input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </Field>
          <Field label="Email">
            <input
              value={profile.email}
              disabled
              className="border border-slate-200 rounded px-3 py-2 text-sm bg-slate-50 text-slate-500"
            />
          </Field>
          <Field label="Phone">
            <input
              value={profile.phone ?? ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+1 555 555 5555"
              className="border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </Field>
          <Field label="Initials">
            <input
              value={profile.initials}
              disabled
              className="border border-slate-200 rounded px-3 py-2 text-sm bg-slate-50 text-slate-500"
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={saveProfile} className="btn-primary text-sm">
            <Save size={14} /> Save profile
          </button>
        </div>
      </Card>

      <Card title="Notifications">
        <Toggle
          label="Email me when I'm assigned"
          description="Send an email when a project or subitem is assigned to me."
          value={settings.emailOnAssignment}
          onChange={(v) => updateSetting("emailOnAssignment", v)}
        />
        <Toggle
          label="Email me when status changes"
          description="Get notified when the status of a project I own changes."
          value={settings.emailOnStatusChange}
          onChange={(v) => updateSetting("emailOnStatusChange", v)}
        />
        <Toggle
          label="Email me about due dates"
          description="Daily reminder when a subitem is due today."
          value={settings.emailOnDueDate}
          onChange={(v) => updateSetting("emailOnDueDate", v)}
        />
        <Toggle
          label="Mute all by default"
          description="New projects start muted; I'll need to unmute to receive their updates."
          value={settings.defaultMute}
          onChange={(v) => updateSetting("defaultMute", v)}
        />
      </Card>

      <Card title="Demo data">
        <p className="text-sm text-slate-600 mb-3">
          You're in demo mode — all data lives in your browser&apos;s local storage. Use this to wipe everything and start over with the seeded example.
        </p>
        <button onClick={resetAll} className="btn-ghost text-sm border border-slate-300">
          <RotateCcw size={14} /> Reset all demo data
        </button>
      </Card>

      {saved && (
        <div className="fixed bottom-6 right-6 bg-brand-dark text-white px-4 py-2 rounded shadow-lg text-sm">
          {saved}
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 mb-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-slate-500 font-medium">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`shrink-0 w-10 h-5 rounded-full transition-colors relative ${
          value ? "bg-brand" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${
            value ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
