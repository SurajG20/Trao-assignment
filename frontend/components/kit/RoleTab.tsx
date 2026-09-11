"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { KitPayload, Requirement } from "@/lib/types";
import {
  isMustHaveGap,
  questionsForRequirement,
  requirementHasGap,
} from "@/lib/kitCoverage";
import { cn } from "@/lib/utils";

const KIND_LABELS: Record<Requirement["kind"], string> = {
  technical: "Technical",
  behavioural: "Behavioural",
  domain: "Domain",
};

function groupRequirements(requirements: Requirement[]) {
  const must = requirements.filter((r) => r.priority === "must");
  const nice = requirements.filter((r) => r.priority === "nice");
  return { must, nice };
}

function RequirementRow({
  kit,
  req,
  onJumpToQuestions,
}: {
  kit: KitPayload;
  req: Requirement;
  onJumpToQuestions?: (questionId: string) => void;
}) {
  const qs = questionsForRequirement(kit, req.id);
  const gap = requirementHasGap(kit, req);
  const mustGap = isMustHaveGap(kit, req);

  return (
    <li
      className={cn(
        "grid gap-3 py-3 sm:grid-cols-[auto_1fr_auto]",
        mustGap && "border-l-2 border-mark pl-3",
      )}
    >
      <span className="pt-0.5 font-mono text-xs text-muted-foreground">{req.id}</span>
      <div className="min-w-0">
        <p className="leading-relaxed">{req.text}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">{KIND_LABELS[req.kind]}</Badge>
          {req.priority === "must" ? (
            <Badge>Must-have</Badge>
          ) : (
            <Badge variant="outline">Nice-to-have</Badge>
          )}
        </div>
        {qs.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {qs.map((q) => (
              <li key={q.id}>
                {onJumpToQuestions ? (
                  <button
                    type="button"
                    className="text-left hover:text-foreground hover:underline"
                    onClick={() => onJumpToQuestions(q.id)}
                  >
                    {q.id}: {q.prompt}
                  </button>
                ) : (
                  <span>{q.id}: {q.prompt}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="sm:text-right">
        {gap ? (
          <span
            className={cn(
              "text-xs",
              mustGap ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {mustGap ? "No questions yet" : "Uncovered"}
          </span>
        ) : (
          <span className="text-xs text-pine">{qs.length} question{qs.length === 1 ? "" : "s"}</span>
        )}
      </div>
    </li>
  );
}

function RequirementGroup({
  title,
  description,
  requirements,
  kit,
  gapsOnly,
  onJumpToQuestions,
}: {
  title: string;
  description: string;
  requirements: Requirement[];
  kit: KitPayload;
  gapsOnly: boolean;
  onJumpToQuestions?: (questionId: string) => void;
}) {
  const visible = gapsOnly
    ? requirements.filter((req) => isMustHaveGap(kit, req))
    : requirements;

  if (requirements.length === 0) return null;

  const gapCount = requirements.filter((req) => isMustHaveGap(kit, req)).length;

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-medium">{title}</h3>
        {gapCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {gapCount} must-have gap{gapCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">{description}</p>
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {gapsOnly ? "Every must-have in this group has at least one question." : "None listed."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {visible.map((req) => (
            <RequirementRow
              key={req.id}
              kit={kit}
              req={req}
              onJumpToQuestions={onJumpToQuestions}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function RoleTab({
  kit,
  onChange,
  onJumpToQuestions,
}: {
  kit: KitPayload;
  onChange: (kit: KitPayload) => void;
  onJumpToQuestions?: (questionId: string) => void;
}) {
  const role = kit.role;
  const [gapsOnly, setGapsOnly] = useState(false);
  const groups = useMemo(() => groupRequirements(role.requirements), [role.requirements]);
  const mustGaps = groups.must.filter((req) => isMustHaveGap(kit, req)).length;

  function updateRole(patch: Partial<KitPayload["role"]>) {
    onChange({ ...kit, role: { ...role, ...patch } });
  }

  return (
    <section className="mt-8 space-y-10">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="role-title">Title</Label>
          <Input
            id="role-title"
            className="font-display text-lg"
            value={role.title}
            onChange={(e) => updateRole({ title: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="role-seniority">Seniority</Label>
          <Input
            id="role-seniority"
            placeholder="e.g. senior"
            value={role.seniority}
            onChange={(e) => updateRole({ seniority: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Responsibilities</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateRole({ responsibilities: [...role.responsibilities, ""] })}
          >
            Add
          </Button>
        </div>
        {role.responsibilities.length === 0 && (
          <p className="text-sm text-muted-foreground">None extracted from the posting.</p>
        )}
        <ul className="space-y-2">
          {role.responsibilities.map((item, index) => (
            <li key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) => {
                  const next = role.responsibilities.slice();
                  next[index] = e.target.value;
                  updateRole({ responsibilities: next });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateRole({
                    responsibilities: role.responsibilities.filter((_, i) => i !== index),
                  })
                }
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-medium">Requirements</h2>
            <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
              Must-haves need at least one linked question. Nice-to-haves are tracked but do not
              count toward coverage.
            </p>
          </div>
          {mustGaps > 0 && (
            <Button
              type="button"
              variant={gapsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setGapsOnly((prev) => !prev)}
            >
              {gapsOnly ? "Show all" : `Show ${mustGaps} gap${mustGaps === 1 ? "" : "s"}`}
            </Button>
          )}
        </div>

        {role.requirements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No requirements extracted — the posting was too thin to invent any.
          </p>
        ) : (
          <div className="space-y-10">
            <RequirementGroup
              title="Must-haves"
              description="These came from required language in the posting. Each needs a question before you are fully covered."
              requirements={groups.must}
              kit={kit}
              gapsOnly={gapsOnly}
              onJumpToQuestions={onJumpToQuestions}
            />
            <RequirementGroup
              title="Nice-to-haves"
              description="Preferred skills or bonus experience. Helpful to prepare, but not part of the coverage bar."
              requirements={groups.nice}
              kit={kit}
              gapsOnly={false}
              onJumpToQuestions={onJumpToQuestions}
            />
          </div>
        )}
      </div>
    </section>
  );
}
