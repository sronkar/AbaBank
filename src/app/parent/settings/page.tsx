import { requireParent } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { updateFamilySettings } from "@/actions/parent";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, PageTitle, Field } from "@/components/ui";
import { PinInput } from "@/components/pin-input";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireParent();
  const settings = getSettings();
  const hasPassphrase = !!settings.gatePassphraseHash;
  return (
    <div>
      <PageTitle emoji="⚙️" title="Bank settings" sub="Family-wide defaults. Per-kid overrides live on each kid's page." />
      <Card className="max-w-lg">
        <ActionForm action={updateFamilySettings} className="space-y-4">
          <Field label="Default interest, % per month">
            <input
              name="interestPctMonthly"
              inputMode="decimal"
              defaultValue={settings.interestPctMonthly}
              className="input"
            />
            <p className="text-xs text-muted font-semibold mt-1">
              Credited on the 1st of each month on everything in savings. 5% keeps it exciting.
            </p>
          </Field>
          <Field label="Default savings lock, days">
            <input name="lockDays" inputMode="numeric" defaultValue={settings.lockDays} className="input" />
          </Field>
          <Field label="ntfy.sh topic for notifications (optional)">
            <input
              name="ntfyTopic"
              defaultValue={settings.ntfyTopic ?? ""}
              placeholder="ababank-cohen-family-x7k2"
              className="input"
            />
            <p className="text-xs text-muted font-semibold mt-1">
              Install the ntfy app, subscribe to a unique topic name, and you&apos;ll get a push when a
              kid requests money. Leave blank to disable.
            </p>
          </Field>
          <div>
            <PinInput
              name="passphrase"
              label={hasPassphrase ? "Change family password (blank = keep)" : "Set a family password"}
              numeric={false}
              placeholder={hasPassphrase ? "•••••••" : "e.g. cohen-family-2026"}
            />
            <p className="text-xs text-muted font-semibold mt-1">
              {hasPassphrase
                ? "Everyone enters this once per device before the login screen. Changing it signs out all devices from the gate."
                : "Recommended before deploying: a shared word everyone types once per device, so strangers can't even see who's in your family."}
            </p>
          </div>
          <div className="text-sm font-bold text-muted">
            Family currency: <b>{settings.currency}</b> (set at first launch)
          </div>
          <SubmitButton>Save settings</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
