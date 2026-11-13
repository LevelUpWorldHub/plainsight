"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { createFirebaseModelRunner } from "@/lib/firebase/model-runner";
import {
  deleteStoredRule,
  listStoredRules,
  notifyRulesChanged,
  saveStoredRule,
} from "@/lib/phi/ledger";
import { interpretRule } from "@/lib/phi/interpret-rule";
import type { PrivacyRule } from "@/lib/phi/types";

const EXAMPLES = [
  "never send my kid's name Maya Chen",
  "keep insurance IDs, hide everything else",
  "always hide SSNs",
  "keep phone numbers",
];

export function RulesWorkbench() {
  const [plain, setPlain] = useState("");
  const [rules, setRules] = useState<PrivacyRule[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  async function refresh() {
    const stored = await listStoredRules<PrivacyRule>();
    setRules(stored);
  }

  useEffect(() => {
    let active = true;
    listStoredRules<PrivacyRule>()
      .then((stored) => {
        if (active) setRules(stored);
      })
      .catch(() => {
        if (active) setError("The rules saved on this device could not be read.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function addRule(text: string) {
    const value = text.trim();
    if (!value) {
      setError("Type a rule first.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const rule = await interpretRule(
        value,
        isFirebaseConfigured() ? createFirebaseModelRunner() : undefined,
      );
      if (rule.directives.length === 0) {
        setError("PlainSight could not turn that sentence into a rule. Name a detail or a category, such as SSNs.");
        return;
      }
      await saveStoredRule(rule);
      notifyRulesChanged();
      setPlain("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The rule was not saved.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    await deleteStoredRule(id);
    notifyRulesChanged();
    setRemoveId(null);
    await refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Rules</p>
        <h1 className="mt-2 font-heading text-4xl tracking-tight text-balance">
          Say what must never leave.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Write a rule the way you would say it at the front desk. PlainSight turns it into a structured
          check on this device. A rule that names a person is never sent to the cloud.
        </p>
      </header>

      <form
        className="paper-panel flex flex-col gap-3 rounded-xl p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void addRule(plain);
        }}
      >
        <Label htmlFor="rule">Rule</Label>
        <Input
          id="rule"
          value={plain}
          onChange={(event) => setPlain(event.target.value)}
          placeholder="never send my kid's name Maya Chen"
          className="h-11"
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <Button
              key={example}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPlain(example)}
            >
              {example}
            </Button>
          ))}
        </div>
        <Button type="submit" className="h-11 w-fit" disabled={pending}>
          {pending ? "Reading the rule…" : "Save rule on this device"}
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </form>

      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No rules yet. The detector still catches labeled fields, record numbers, and common medications.
          A rule is how you catch a name that only appears in a sentence.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rules.map((rule) => (
            <li key={rule.id} className="paper-panel rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{rule.plainText}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setRemoveId(rule.id)}>
                  Remove
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{rule.interpretation}</p>
              <p className="mt-2 text-xs tracking-wide text-primary uppercase">
                {rule.source === "on_device_model" ? "Read by Gemini Nano" : "Read on this device"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={removeId !== null} onOpenChange={(open) => !open && setRemoveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this rule?</DialogTitle>
            <DialogDescription>
              Later scans on this browser will stop applying it. Already approved outbox entries stay in the ledger.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveId(null)}>
              Keep the rule
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => removeId && void remove(removeId)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
