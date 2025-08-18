# circleci-autocancel

> Cancel redundant CircleCI workflows on the same branch — **including the default branch** — so only the latest run survives.

**Unofficial.** This is not an official CircleCI product.

## Features

- Cancels **older pipelines' workflows** with `running` / `on_hold` status on the same branch
- Works on default branch (unlike CircleCI's built-in auto-cancel)
- Supports workflow name matching with exact match or regex patterns
- Safe `--dry-run` mode to preview what would be cancelled
- Available as both CLI tool and library API

## Installation

```bash
npm i -D circleci-autocancel
# or use with npx on demand
```

## Usage (CLI)

Usually run as the **first job** in your workflow:

```yaml
# .circleci/config.yml example
version: 2.1

jobs:
  autocancel:
    docker:
      - image: cimg/node:20.12
    steps:
      - checkout
      - run:
          name: Cancel redundant workflows (default branch included)
          command: |
            npx circleci-autocancel \
              --max-pages 3 \
              --sleep-ms 120

workflows:
  build:
    jobs:
      - autocancel
      - test:
          requires: [autocancel]
```

### Required Environment Variables

- **Set by CircleCI automatically**: `CIRCLE_PIPELINE_ID`, `CIRCLE_WORKFLOW_ID`
- **Authentication token**: `CIRCLECI_TOKEN` (or `CIRCLE_TOKEN` / `CIRCLECI_PERSONAL_TOKEN`)
  - **Personal API Token** recommended. Store in organization **Context** or project environment variables.

### Main Options

```
circleci-autocancel [options]
  -t, --token <token>        Token (defaults to env)
  -p, --pipeline-id <id>     Pipeline ID (defaults to env)
  -w, --workflow-id <id>     Workflow ID (defaults to env)
      --project-slug <slug>  e.g. gh/org/repo (resolved from pipeline if omitted)
  -b, --branch <name>        Resolved from pipeline if omitted
      --workflow-name <name> Override current workflow name
      --name-pattern <regex> Regex pattern for workflow names (overrides --workflow-name)
      --max-pages <n>        Max pipeline pages to scan (default 3)
      --statuses <csv>       e.g. running,on_hold (default)
      --sleep-ms <n>         API call delay in ms (default 120)
      --api-base <url>       API base URL (default https://circleci.com/api/v2)
  -n, --dry-run              Log only, don't cancel
  -v, --verbose              Verbose logging
```

### Library API

```ts
import { autocancel } from "circleci-autocancel";

await autocancel({
  // token, pipelineId, workflowId will use env if omitted
  maxPages: 3,
  dryRun: false,
  workflowNamePattern: "^build-",
});
```

## Development

```bash
pnpm i
pnpm run build
pnpm test
```

## License

MIT
