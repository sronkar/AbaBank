import { requireParent } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { updateFamilySettings } from "@/actions/parent";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, PageTitle, inputClass, labelClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireParent();
  const settings = getSettings();
  return (
    <div>
      <PageTitle emoji="⚙️" title="Bank settings" sub="Family-wide defaults. Per-kid overrides live on each kid's page." />
      <Card className="max-w-lg">
        <ActionForm action={updateFamilySettings} className="space-y-4">
          <div>
            <label className={labelClass}>Default interest, % per month</label>
            <input
              name="interestPctMonthly"
              inputMode="decimal"
              defaultValue={settings.interestPctMonthly}
              className={inputClass}
            />
            <p className="text-xs text-slate-400 mt-1">
              Credited on the 1st of each month on everything in savings. 5% keeps it exciting.
            </p>
          </div>
          <div>
            <label className={labelClass}>Default savings lock, days</label>
            <input name="lockDays" inputMode="numeric" defaultValue={settings.lockDays} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>ntfy.sh topic for notifications (optional)</label>
            <input
              name="ntfyTopic"
              defaultValue={settings.ntfyTopic ?? ""}
              placeholder="ababank-cohen-family-x7k2"
              className={inputClass}
            />
            <p className="text-xs text-slate-400 mt-1">
              Install the ntfy app, subscribe to a unique topic name, and you&apos;ll get a push when a
              kid requests money. Leave blank to disable.
            </p>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Family currency: <b>{settings.currency}</b> (set at first launch)
          </div>
          <SubmitButton>Save settings</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
