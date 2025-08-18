export type PipelineGet = {
  id: string;
  number: number;
  project_slug: string; // e.g. "gh/org/repo"
  vcs: { branch?: string; tag?: string };
};

export type PipelinesList = {
  items: { id: string; number: number; state: string; created_at: string }[];
  next_page_token?: string | null;
};

export type WorkflowsList = {
  items: {
    id: string;
    name: string;
    status:
      | "running"
      | "on_hold"
      | "not_run"
      | "success"
      | "failed"
      | "error"
      | "failing"
      | "canceled"
      | "unauthorized";
    pipeline_number: number;
  }[];
  next_page_token?: string | null;
};

export type AutocancelOptions = {
  token?: string; // Will use env if not specified
  pipelineId?: string; // Will use env.CIRCLE_PIPELINE_ID if not specified
  workflowId?: string; // Will use env.CIRCLE_WORKFLOW_ID if not specified
  projectSlug?: string; // Will be fetched from /pipeline/{id} if not specified
  branch?: string; // Will be fetched from /pipeline/{id} if not specified
  workflowName?: string; // Will use current workflow name if not specified
  workflowNamePattern?: string; // Regex pattern to override workflow name matching (--name-pattern)
  maxPages?: number; // Default 3
  dryRun?: boolean; // Default false
  statuses?: Array<"running" | "on_hold">; // Default ["running","on_hold"]
  apiBase?: string; // Default https://circleci.com/api/v2
  sleepMs?: number; // API call delay to avoid rate limiting (default 120ms)
  verbose?: boolean; // Verbose logging
};

export type AutocancelReport = {
  canceledWorkflows: string[];
  scannedPipelines: number;
  matchedWorkflows: number;
  current: {
    projectSlug: string;
    branch: string;
    workflowName: string;
    pipelineNumber: number;
  };
  dryRun: boolean;
};
