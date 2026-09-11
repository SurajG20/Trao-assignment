"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
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
        "flex items-start justify-between gap-4 py-3.5",
        mustGap && "border-l-2 border-amber-400 pl-3",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="leading-relaxed">{req.text}</p>
        {qs.length > 0 && onJumpToQuestions && (
          <button
            type="button"
            className="mt-2 text-sm text-primary hover:underline"
            onClick={() => onJumpToQuestions(qs[0].id)}
          >
            View {qs.length} question{qs.length === 1 ? "" : "s"}
          </button>
        )}
      </div>
      <div className="shrink-0 text-right">
        {gap ? (
          <span className="text-xs text-amber-700">{mustGap ? "No questions" : "Uncovered"}</span>
        ) : (
          <span className="text-xs text-pine">Covered</span>
        )}
      </div>
    </li>
  );
}

function RequirementGroup({
  title,
  requirements,
  kit,
  gapsOnly,
  onJumpToQuestions,
}: {
  title: string;
  requirements: Requirement[];
  kit: KitPayload;
  gapsOnly: boolean;
  onJumpToQuestions?: (questionId: string) => void;
}) {
  const visible = gapsOnly
    ? requirements.filter((req) => isMustHaveGap(kit, req))
    : requirements;

  if (requirements.length === 0) return null;

  return (
    <section className="panel p-5 sm:p-6">
      <h3 className="font-display text-lg font-medium">{title}</h3>
      {visible.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">All must-haves have questions.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
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
    <section className="mt-6 space-y-4">
      <div className="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <div className="grid gap-2">
          <Label htmlFor="role-title">Title</Label>
          <Input
            id="role-title"
            className="border-0 bg-secondary/50 font-display text-lg shadow-none focus-visible:ring-1"
            value={role.title}
            onChange={(e) => updateRole({ title: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="role-seniority">Seniority</Label>
          <Input
            id="role-seniority"
            className="border-0 bg-secondary/50 shadow-none focus-visible:ring-1"
            placeholder="e.g. senior"
            value={role.seniority}
            onChange={(e) => updateRole({ seniority: e.target.value })}
          />
        </div>
      </div>

      <div className="panel p-5 sm:p-6">
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
        {role.responsibilities.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">None extracted.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {role.responsibilities.map((item, index) => (
              <li key={index} className="flex gap-2">
                <Input
                  className="border-0 bg-secondary/50 shadow-none focus-visible:ring-1"
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
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    updateRole({
                      responsibilities: role.responsibilities.filter((_, i) => i !== index),
                    })
                  }
                >
                  <X className="size-4" />
                  <span className="sr-only">Remove</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-medium">Requirements</h2>
        {mustGaps > 0 && (
          <Button
            type="button"
            variant={gapsOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setGapsOnly((prev) => !prev)}
          >
            {gapsOnly ? "Show all" : `${mustGaps} gap${mustGaps === 1 ? "" : "s"}`}
          </Button>
        )}
      </div>

      {role.requirements.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requirements extracted from the posting.</p>
      ) : (
        <div className="space-y-4">
          <RequirementGroup
            title="Must-haves"
            requirements={groups.must}
            kit={kit}
            gapsOnly={gapsOnly}
            onJumpToQuestions={onJumpToQuestions}
          />
          {groups.nice.length > 0 && (
            <RequirementGroup
              title="Nice-to-haves"
              requirements={groups.nice}
              kit={kit}
              gapsOnly={false}
              onJumpToQuestions={onJumpToQuestions}
            />
          )}
        </div>
      )}
    </section>
  );
}
