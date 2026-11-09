import type { KnowledgePack } from "./types"

const now = "2026-03-20T12:00:00.000Z"

/** Seed pack: on-call SRE tribal knowledge for agents. */
export function createSamplePack(): KnowledgePack {
  return {
    id: crypto.randomUUID(),
    name: "On-call incident triage",
    domain: "Site reliability / production incidents",
    purpose:
      "Give an incident agent the judgment veterans use in the first 15 minutes: what to check, what to ignore, and when to escalate.",
    audience: "Pager-duty agents and human responders sharing a runbook",
    createdAt: now,
    updatedAt: now,
    heuristics: [
      {
        id: crypto.randomUUID(),
        title: "Symptom first, root cause later",
        when: "A page fires and dashboards look noisy or contradictory",
        then: "Stabilize user impact before chasing the deepest cause. Confirm blast radius, mitigate, then dig.",
        because:
          "Early root-cause hunts burn the golden window. Customers care about recovery; forensics can wait once the fire is contained.",
        unless: [
          "The mitigation itself requires knowing the cause (e.g. bad deploy vs. capacity)",
          "You already have a known-good rollback with near-zero risk",
        ],
        confidence: "high",
        tags: ["triage", "first-15", "mitigation"],
        source: "Senior SRE rotation notes",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        title: "Recent change bias",
        when: "Error rates spike within 30–90 minutes of a deploy, config change, or feature flag flip",
        then: "Treat the recent change as the primary suspect until disproven. Diff, canary, or roll back.",
        because:
          "Most production incidents correlate with change. Starting elsewhere wastes time on chronic noise.",
        unless: [
          "The change is unrelated by service boundary and traffic path",
          "A dependency outage is already confirmed upstream",
        ],
        confidence: "high",
        tags: ["deploy", "change-management"],
        source: "Postmortem pattern library",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        title: "One writer in the war room",
        when: "More than three people are actively debugging the same incident",
        then: "Designate a single incident commander and a single comms owner. Others investigate only assigned threads.",
        because:
          "Parallel uncoordinated changes amplify damage and pollute the timeline.",
        unless: ["The incident is clearly isolated to one expert's domain"],
        confidence: "medium",
        tags: ["comms", "coordination"],
        source: "Incident command playbook",
        createdAt: now,
        updatedAt: now,
      },
    ],
    procedures: [
      {
        id: crypto.randomUUID(),
        title: "First-15 triage",
        goal: "Decide mitigate vs. dig, with a shared status in under 15 minutes",
        whenToUse: "Any Sev-1/Sev-2 page or customer-visible degradation",
        whenNotToUse: "Planned maintenance windows already covered by a change ticket",
        steps: [
          {
            id: crypto.randomUUID(),
            action: "Acknowledge the page and open the incident channel",
            check: "Channel exists; IC role claimed",
            note: "If alone, claim IC yourself immediately",
          },
          {
            id: crypto.randomUUID(),
            action: "State user impact in one sentence",
            check: "Impact, scope, and start time written in channel",
            note: "Prefer customer language over internal service names",
          },
          {
            id: crypto.randomUUID(),
            action: "Check the last three changes and top dependency health",
            check: "Deploy board + status page reviewed",
            note: "Screenshot or link evidence into the channel",
          },
          {
            id: crypto.randomUUID(),
            action: "Choose mitigate or dig; announce the choice",
            check: "Mitigation owner assigned or dig hypothesis stated",
            note: "Revisit every 10 minutes if unresolved",
          },
        ],
        tags: ["triage", "runbook"],
        source: "On-call handbook v4",
        createdAt: now,
        updatedAt: now,
      },
    ],
    gotchas: [
      {
        id: crypto.randomUUID(),
        title: "Dashboard lag looks like recovery",
        symptom: "Graphs flatten or improve right after you act",
        cause:
          "Many panels use 1–5 minute rollups; the system may still be failing while charts look calm",
        fix: "Confirm with live request logs, synthetic checks, or a fresh canary probe—not only dashboards",
        prevention:
          "Pin at least one low-latency signal (error counter, queue depth) next to rolled-up SLIs",
        tags: ["observability", "false-recovery"],
        source: "War-room debrief 2025-11",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        title: "Retry storms after partial outages",
        symptom: "Traffic and errors surge after a brief blip, worse than the original fault",
        cause: "Clients retry without jitter; backed-up queues flush at once",
        fix: "Shed load, raise backoff, or temporarily disable aggressive client retries at the edge",
        prevention: "Require jittered exponential backoff on every external client SDK",
        tags: ["retries", "cascades"],
        source: "Capacity working group",
        createdAt: now,
        updatedAt: now,
      },
    ],
    terms: [
      {
        id: crypto.randomUUID(),
        term: "Blast radius",
        definition:
          "The set of users, regions, or dependent services affected by a failure—used to size severity and mitigation urgency.",
        aliases: ["impact scope"],
        related: ["Sev", "mitigation"],
        source: "SRE glossary",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        term: "Mitigate-first",
        definition:
          "A triage posture that prioritizes restoring service over completing root-cause analysis during the incident window.",
        aliases: ["stabilize first"],
        related: ["First-15", "rollback"],
        source: "SRE glossary",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        term: "IC",
        definition:
          "Incident Commander—the single person accountable for prioritization, coordination, and decision cadence during an incident.",
        aliases: ["incident commander"],
        related: ["comms owner", "war room"],
        source: "Incident command playbook",
        createdAt: now,
        updatedAt: now,
      },
    ],
  }
}
