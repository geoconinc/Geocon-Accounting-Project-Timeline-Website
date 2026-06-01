"use client";

import Image from "next/image";
import { Mail } from "lucide-react";

export function SettingsView() {
  return (
    <div className="p-6 overflow-auto h-full max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-brand-dark">Settings</h1>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 flex flex-col items-center text-center">
        <Image src="/logo.png" alt="Geocon" width={56} height={21} priority className="mb-4" />
        <h2 className="text-base font-semibold text-slate-800">Need help?</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          For any questions, requests, or issues with the Geocon Project Timeline,
          please reach out to:
        </p>
        <a
          href="mailto:mundra@geoconinc.com"
          className="mt-5 inline-flex items-center gap-2 text-brand hover:text-brand-dark font-semibold"
        >
          <Mail size={16} />
          mundra@geoconinc.com
        </a>
      </div>
    </div>
  );
}
