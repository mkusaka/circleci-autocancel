import { CircleCIApi } from "./circleci.js";
import type {
  AutocancelOptions,
  AutocancelReport,
  WorkflowsList,
} from "./types.js";

const DEFAULT_STATUSES = ["running", "on_hold"] as const;

function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

function pickToken(opt?: string): string {
  return (
    opt ||
    env("CIRCLECI_TOKEN") ||
    env("CIRCLE_TOKEN") ||
    env("CIRCLECI_PERSONAL_TOKEN") ||
    (() => {
      throw new Error(
        "CircleCI token not provided. Pass --token or set CIRCLECI_TOKEN / CIRCLE_TOKEN / CIRCLECI_PERSONAL_TOKEN.",
      );
    })()
  );
}

async function sleep(ms: number) {
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
}

export async function autocancel(
  options: AutocancelOptions = {},
): Promise<AutocancelReport> {
  const token = pickToken(options.token);
  const api = new CircleCIApi(
    token,
    options.apiBase ?? "https://circleci.com/api/v2",
  );

  const currentPipelineId = options.pipelineId ?? env("CIRCLE_PIPELINE_ID");
  const currentWorkflowId = options.workflowId ?? env("CIRCLE_WORKFLOW_ID");
  if (!currentPipelineId)
    throw new Error(
      "Missing pipeline id. Provide --pipeline-id or set CIRCLE_PIPELINE_ID.",
    );
  if (!currentWorkflowId)
    throw new Error(
      "Missing workflow id. Provide --workflow-id or set CIRCLE_WORKFLOW_ID.",
    );

  const maxPages = options.maxPages ?? 3;
  const dryRun = Boolean(options.dryRun);
  const sleepMs = options.sleepMs ?? 120;
  const statuses = new Set<(typeof DEFAULT_STATUSES)[number]>(
    options.statuses ?? [...DEFAULT_STATUSES],
  );

  // 1) Get current pipeline info
  const curPipe =
    options.projectSlug && options.branch
      ? {
          number: NaN,
          project_slug: options.projectSlug,
          vcs: { branch: options.branch },
        }
      : await api.getPipeline(currentPipelineId);

  const projectSlug = options.projectSlug ?? curPipe.project_slug;
  const branch = options.branch ?? curPipe.vcs.branch;
  if (!branch)
    throw new Error(
      "Current build does not have a branch (likely a tag build). Provide --branch to override.",
    );

  // 2) Get current workflow name and current pipeline number
  const curWfs: WorkflowsList =
    await api.listWorkflowsByPipeline(currentPipelineId);
  const curWf = curWfs.items.find((w) => w.id === currentWorkflowId);
  if (!curWf)
    throw new Error(
      `Current workflow ${currentWorkflowId} not found in pipeline ${currentPipelineId}.`,
    );
  const currentNumber = curWf.pipeline_number;
  const currentWorkflowName = options.workflowName ?? curWf.name;

  // Workflow name filtering logic (--name-pattern takes precedence)
  const wfPredicate = (() => {
    if (options.workflowNamePattern) {
      const re = new RegExp(options.workflowNamePattern);
      return (name: string) => re.test(name);
    }
    return (name: string) => name === currentWorkflowName;
  })();

  if (options.verbose) {
    console.log(
      `[context] slug=${projectSlug} branch=${branch} wf="${currentWorkflowName}" curNo=${currentNumber} pattern=${options.workflowNamePattern ?? "(exact)"}`,
    );
  }

  // 3) List older pipelines on the same branch (with paging)
  const olderPipelineIds: string[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const page = await api.listPipelines(projectSlug, branch, pageToken);
    for (const p of page.items) {
      if (Number.isFinite(currentNumber) && p.number < currentNumber) {
        olderPipelineIds.push(p.id);
      }
    }
    if (!page.next_page_token) break;
    pageToken = page.next_page_token || undefined;
    await sleep(sleepMs);
  }

  if (options.verbose)
    console.log(`[scan] older pipelines found: ${olderPipelineIds.length}`);

  // 4) Find target workflows in older pipelines and cancel running/on_hold ones
  const canceled: string[] = [];
  let matched = 0;

  for (const pid of olderPipelineIds) {
    const wfs = await api.listWorkflowsByPipeline(pid);
    const targets = wfs.items.filter(
      (w) => wfPredicate(w.name) && statuses.has(w.status as any),
    );

    matched += targets.length;

    for (const w of targets) {
      if (dryRun) {
        console.log(
          `[dry-run] would cancel: wf=${w.id} name="${w.name}" (#${w.pipeline_number})`,
        );
      } else {
        const status = await api.cancelWorkflow(w.id);
        if (status === 202 || status === 200) {
          console.log(
            `[cancelled] wf=${w.id} name="${w.name}" (#${w.pipeline_number})`,
          );
          canceled.push(w.id);
        } else {
          console.warn(`[warn] cancel failed: wf=${w.id} -> HTTP ${status}`);
        }
        await sleep(sleepMs);
      }
    }
    await sleep(sleepMs);
  }

  return {
    canceledWorkflows: canceled,
    scannedPipelines: olderPipelineIds.length,
    matchedWorkflows: matched,
    current: {
      projectSlug,
      branch,
      workflowName: currentWorkflowName,
      pipelineNumber: currentNumber,
    },
    dryRun,
  };
}
