import { describe, it, expect, beforeEach, vi } from "vitest";
import { autocancel } from "../src/index.js";
import type {
  PipelinesList,
  WorkflowsList,
  PipelineGet,
} from "../src/types.js";

// Simple HTTP mock
function jsonResponse(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const API = "https://circleci.com/api/v2";

describe("autocancel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Default environment (can be overridden)
    process.env.CIRCLE_PIPELINE_ID = "pipe-cur";
    process.env.CIRCLE_WORKFLOW_ID = "wf-cur";
    process.env.CIRCLECI_TOKEN = "token";
  });

  it("cancels all running/on_hold workflows of older pipelines by default", async () => {
    // 1) GET /pipeline/pipe-cur
    const pipelineGet: PipelineGet = {
      id: "pipe-cur",
      number: 42,
      project_slug: "gh/org/repo",
      vcs: { branch: "main" },
    };

    // 2) GET /pipeline/pipe-cur/workflow (current workflow info)
    const curWfs: WorkflowsList = {
      items: [
        {
          id: "wf-cur",
          name: "build-and-deploy",
          status: "running",
          pipeline_number: 42,
        },
      ],
    };

    // 3) GET /project/gh/org/repo/pipeline?branch=main
    const list1: PipelinesList = {
      items: [
        {
          id: "pipe-41",
          number: 41,
          state: "created",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "pipe-39",
          number: 39,
          state: "created",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    // 4) GET /pipeline/pipe-41/workflow
    const w41: WorkflowsList = {
      items: [
        {
          id: "wf-41-a",
          name: "build-and-deploy",
          status: "running",
          pipeline_number: 41,
        },
        {
          id: "wf-41-b",
          name: "other",
          status: "running",
          pipeline_number: 41,
        },
      ],
    };
    // 5) GET /pipeline/pipe-39/workflow
    const w39: WorkflowsList = {
      items: [
        {
          id: "wf-39-a",
          name: "build-and-deploy",
          status: "on_hold",
          pipeline_number: 39,
        },
      ],
    };

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = typeof input === "string" ? input : (input as Request).url;

        if (
          url === `${API}/pipeline/pipe-cur` &&
          (!init?.method || init.method === "GET")
        ) {
          return jsonResponse(pipelineGet);
        }
        if (
          url === `${API}/pipeline/pipe-cur/workflow` &&
          (!init?.method || init.method === "GET")
        ) {
          return jsonResponse(curWfs);
        }
        if (
          url ===
            `${API}/project/${encodeURIComponent("gh/org/repo")}/pipeline?branch=main` &&
          (!init?.method || init.method === "GET")
        ) {
          return jsonResponse(list1);
        }
        if (
          url === `${API}/pipeline/pipe-41/workflow` &&
          (!init?.method || init.method === "GET")
        ) {
          return jsonResponse(w41);
        }
        if (
          url === `${API}/pipeline/pipe-39/workflow` &&
          (!init?.method || init.method === "GET")
        ) {
          return jsonResponse(w39);
        }
        if (
          url === `${API}/workflow/wf-41-a/cancel` &&
          init?.method === "POST"
        ) {
          return new Response(null, { status: 202 });
        }
        if (
          url === `${API}/workflow/wf-39-a/cancel` &&
          init?.method === "POST"
        ) {
          return new Response(null, { status: 202 });
        }
        return new Response("not mocked", { status: 500 });
      });

    const report = await autocancel({ sleepMs: 0, verbose: true });
    expect(report.scannedPipelines).toBe(2);
    expect(report.matchedWorkflows).toBe(3); // Now matches all workflows by default
    expect(report.canceledWorkflows.length).toBe(2); // wf-41-b returns 500 error
    expect(fetchMock).toHaveBeenCalled();
  });

  it("dry-run does not POST cancel", async () => {
    const pipelineGet: PipelineGet = {
      id: "pipe-cur",
      number: 10,
      project_slug: "gh/x/y",
      vcs: { branch: "main" },
    };
    const curWfs: WorkflowsList = {
      items: [
        { id: "wf-cur", name: "wf", status: "running", pipeline_number: 10 },
      ],
    };
    const list1: PipelinesList = {
      items: [
        {
          id: "pipe-9",
          number: 9,
          state: "created",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
    };
    const w9: WorkflowsList = {
      items: [
        { id: "wf-9-a", name: "wf", status: "running", pipeline_number: 9 },
      ],
    };

    const postSpy = vi.fn();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (
        url.endsWith("/pipeline/pipe-cur") &&
        (!init?.method || init.method === "GET")
      )
        return jsonResponse(pipelineGet);
      if (
        url.endsWith("/pipeline/pipe-cur/workflow") &&
        (!init?.method || init.method === "GET")
      )
        return jsonResponse(curWfs);
      if (url.includes("/project/") && url.includes("/pipeline?branch="))
        return jsonResponse(list1);
      if (
        url.endsWith("/pipeline/pipe-9/workflow") &&
        (!init?.method || init.method === "GET")
      )
        return jsonResponse(w9);
      if (url.endsWith("/cancel") && init?.method === "POST") {
        postSpy();
        return new Response(null, { status: 202 });
      }
      return new Response("not mocked", { status: 500 });
    });

    const report = await autocancel({ dryRun: true, sleepMs: 0 });
    expect(report.canceledWorkflows.length).toBe(0);
    expect(report.matchedWorkflows).toBe(1);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("supports --name-pattern to select multiple workflow names", async () => {
    const pipelineGet: PipelineGet = {
      id: "pipe-cur",
      number: 100,
      project_slug: "gh/p/q",
      vcs: { branch: "main" },
    };
    const curWfs: WorkflowsList = {
      items: [
        {
          id: "wf-cur",
          name: "build-app",
          status: "running",
          pipeline_number: 100,
        },
      ],
    };
    const list1: PipelinesList = {
      items: [
        {
          id: "pipe-99",
          number: 99,
          state: "created",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
    };
    const w99: WorkflowsList = {
      items: [
        {
          id: "wf-99-a",
          name: "build-web",
          status: "running",
          pipeline_number: 99,
        },
        {
          id: "wf-99-b",
          name: "test-web",
          status: "running",
          pipeline_number: 99,
        },
        {
          id: "wf-99-c",
          name: "build-api",
          status: "on_hold",
          pipeline_number: 99,
        },
      ],
    };

    const cancelled: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.endsWith("/pipeline/pipe-cur")) return jsonResponse(pipelineGet);
      if (url.endsWith("/pipeline/pipe-cur/workflow"))
        return jsonResponse(curWfs);
      if (url.includes("/project/") && url.includes("/pipeline?branch="))
        return jsonResponse(list1);
      if (url.endsWith("/pipeline/pipe-99/workflow")) return jsonResponse(w99);
      if (
        url.includes("/workflow/") &&
        url.endsWith("/cancel") &&
        init?.method === "POST"
      ) {
        cancelled.push(url);
        return new Response(null, { status: 202 });
      }
      return new Response("not mocked", { status: 500 });
    });

    const report = await autocancel({
      sleepMs: 0,
      workflowNamePattern: "^build-",
      statuses: ["running", "on_hold"],
    });
    // build-web + build-api should be targeted (test-web excluded)
    expect(report.matchedWorkflows).toBe(2);
    expect(report.canceledWorkflows.length).toBe(2);
    expect(cancelled.length).toBe(2);
  });
});
