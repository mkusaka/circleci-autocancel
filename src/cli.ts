#!/usr/bin/env node
import { Command } from "commander";
import { autocancel } from "./index.js";

const program = new Command();

program
  .name("circleci-autocancel")
  .description(
    "Cancel redundant CircleCI workflows on the same branch (including default branch)",
  )
  .option(
    "-t, --token <token>",
    "CircleCI personal token (fallback: env CIRCLECI_TOKEN/CIRCLE_TOKEN/CIRCLECI_PERSONAL_TOKEN)",
  )
  .option(
    "-p, --pipeline-id <id>",
    "Current pipeline id (default: env CIRCLE_PIPELINE_ID)",
  )
  .option(
    "-w, --workflow-id <id>",
    "Current workflow id (default: env CIRCLE_WORKFLOW_ID)",
  )
  .option(
    "--project-slug <slug>",
    "Project slug (e.g. gh/org/repo). If omitted, resolved from pipeline.",
  )
  .option(
    "-b, --branch <name>",
    "Branch name. If omitted, resolved from pipeline.",
  )
  .option(
    "--workflow-name <name>",
    "Exact workflow name to match (default: current workflow name)",
  )
  .option(
    "--workflow-name-pattern <regex>",
    "Regex to match workflow names (overrides --workflow-name)",
  )
  .option(
    "--max-pages <n>",
    "How many pages of pipelines to scan (default: 3)",
    (v) => parseInt(v, 10),
  )
  .option(
    "--statuses <csv>",
    "Statuses to cancel (default: running,on_hold)",
    (v) => v.split(","),
  )
  .option(
    "--api-base <url>",
    "CircleCI API base (default: https://circleci.com/api/v2)",
  )
  .option("--sleep-ms <n>", "Sleep ms between API calls (default: 120)", (v) =>
    parseInt(v, 10),
  )
  .option("-n, --dry-run", "Do not cancel, just log")
  .option("-v, --verbose", "Verbose logs")
  .action(async (opts) => {
    try {
      const report = await autocancel({
        token: opts.token,
        pipelineId: opts.pipelineId,
        workflowId: opts.workflowId,
        projectSlug: opts.projectSlug,
        branch: opts.branch,
        workflowName: opts.workflowName,
        workflowNamePattern: opts.workflowNamePattern,
        maxPages: opts.maxPages,
        dryRun: Boolean(opts.dryRun),
        statuses: opts.statuses,
        apiBase: opts.apiBase,
        sleepMs: opts.sleepMs,
        verbose: Boolean(opts.verbose),
      });

      if (opts.verbose) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(
          report.dryRun
            ? `[done] dry-run. scanned=${report.scannedPipelines} matched=${report.matchedWorkflows}`
            : `[done] cancelled=${report.canceledWorkflows.length} scanned=${report.scannedPipelines} matched=${report.matchedWorkflows}`,
        );
      }
      process.exit(0);
    } catch (e: any) {
      console.error(`[error] ${e?.message || e}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
