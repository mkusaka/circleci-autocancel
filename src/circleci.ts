import type { PipelineGet, PipelinesList, WorkflowsList } from "./types.js";

export class CircleCIApi {
  constructor(
    private token: string,
    private base = "https://circleci.com/api/v2",
  ) {}

  private headers() {
    return {
      "Circle-Token": this.token,
      Accept: "application/json",
    };
  }

  async getPipeline(pipelineId: string): Promise<PipelineGet> {
    const res = await fetch(`${this.base}/pipeline/${pipelineId}`, {
      headers: this.headers(),
    });
    if (!res.ok)
      throw new Error(
        `GET pipeline ${pipelineId} -> HTTP ${res.status}: ${await res.text()}`,
      );
    return res.json() as Promise<PipelineGet>;
  }

  async listPipelines(
    projectSlug: string,
    branch: string,
    pageToken?: string,
  ): Promise<PipelinesList> {
    const qs = new URLSearchParams();
    qs.set("branch", branch);
    if (pageToken) qs.set("page-token", pageToken);
    const res = await fetch(
      `${this.base}/project/${encodeURIComponent(projectSlug)}/pipeline?${qs}`,
      {
        headers: this.headers(),
      },
    );
    if (!res.ok)
      throw new Error(
        `LIST pipelines -> HTTP ${res.status}: ${await res.text()}`,
      );
    return res.json() as Promise<PipelinesList>;
  }

  async listWorkflowsByPipeline(pipelineId: string): Promise<WorkflowsList> {
    const res = await fetch(`${this.base}/pipeline/${pipelineId}/workflow`, {
      headers: this.headers(),
    });
    if (!res.ok)
      throw new Error(
        `LIST workflows of pipeline ${pipelineId} -> HTTP ${res.status}: ${await res.text()}`,
      );
    return res.json() as Promise<WorkflowsList>;
  }

  async cancelWorkflow(workflowId: string): Promise<number> {
    const res = await fetch(`${this.base}/workflow/${workflowId}/cancel`, {
      method: "POST",
      headers: this.headers(),
    });
    return res.status;
  }
}
