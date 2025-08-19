# circleci-autocancel

> Cancel redundant CircleCI workflows on the same branch — **including the default branch** — so only the latest run survives.

**Unofficial.** This is not an official CircleCI product.

## Features

- Cancels **older pipelines' workflows** with `running` / `on_hold` status on the same branch
- Works on default branch (unlike CircleCI's built-in auto-cancel)
- Supports workflow name matching with exact match or regex patterns
- Safe `--dry-run` mode to preview what would be cancelled
- Available as both CLI tool and library API

## How It Works

1. **Targets same branch only**: Only cancels workflows on the same branch as the current build
2. **Scans recent pipelines**: By default, scans up to 3 pages of pipelines (approximately 60-90 pipelines)
3. **Filters older pipelines**: Only targets pipelines with numbers lower than the current pipeline
4. **Cancels running/on_hold workflows**: Only affects active workflows, not completed ones
5. **Respects workflow names**: By default, only cancels workflows with the same name as the current workflow

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
      --max-pages <n>        Max pipeline pages to scan (default: 3)
                             Each page contains ~20-30 pipelines
                             Use higher values for busy branches
      --statuses <csv>       e.g. running,on_hold (default)
      --sleep-ms <n>         API call delay in ms (default: 120)
      --api-base <url>       API base URL (default: https://circleci.com/api/v2)
  -n, --dry-run              Log only, don't cancel
  -v, --verbose              Verbose logging
```

## CircleCI Configuration Examples

### Basic Setup

Install from npm and run as the first job:

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  autocancel:
    docker:
      - image: cimg/node:22.18
    steps:
      - run:
          name: Install and run circleci-autocancel
          command: |
            npm install -g circleci-autocancel
            circleci-autocancel --verbose

  build:
    docker:
      - image: cimg/node:22.18
    steps:
      - checkout
      - run: npm install
      - run: npm test

workflows:
  main:
    jobs:
      - autocancel:
          context:
            - circleci-api # Contains CIRCLECI_TOKEN
      - build:
          requires:
            - autocancel
```

### Monorepo with Path Filtering

For monorepos using dynamic configuration:

```yaml
# .circleci/config.yml
version: 2.1
setup: true

orbs:
  path-filtering: circleci/path-filtering@2.0.2

workflows:
  setup:
    jobs:
      - path-filtering/filter:
          mapping: |
            packages/frontend/.* run-frontend true
            packages/backend/.*  run-backend true
            packages/shared/.*   run-shared true
          base-revision: main
          config-path: .circleci/continue.yml
```

```yaml
# .circleci/continue.yml
version: 2.1

parameters:
  run-frontend:
    type: boolean
    default: false
  run-backend:
    type: boolean
    default: false
  run-shared:
    type: boolean
    default: false

jobs:
  autocancel:
    docker:
      - image: cimg/node:22.18
    steps:
      - run:
          name: Autocancel redundant workflows
          command: |
            npm install -g circleci-autocancel
            # Each workflow will only cancel its own type
            circleci-autocancel \
              --verbose

workflows:
  frontend-workflow:
    when: << pipeline.parameters.run-frontend >>
    jobs:
      - autocancel:
          context: [circleci-api]
      - frontend-build:
          requires: [autocancel]
      - frontend-test:
          requires: [frontend-build]

  backend-workflow:
    when: << pipeline.parameters.run-backend >>
    jobs:
      - autocancel:
          context: [circleci-api]
      - backend-build:
          requires: [autocancel]
      - backend-test:
          requires: [backend-build]
```

### Global Autocancel in Setup Workflow

Cancel ALL old workflows during setup phase (useful for monorepos):

```yaml
# .circleci/config.yml with global autocancel
version: 2.1
setup: true

orbs:
  path-filtering: circleci/path-filtering@2.0.2

jobs:
  global-autocancel:
    docker:
      - image: cimg/node:22.18
    steps:
      - run:
          name: Cancel ALL old workflows
          command: |
            npm install -g circleci-autocancel
            # Cancel ALL workflow types with regex
            circleci-autocancel \
              --name-pattern ".*" \
              --verbose \
              --max-pages 5

workflows:
  setup:
    jobs:
      - global-autocancel:
          context: [circleci-api]
      - path-filtering/filter:
          requires: [global-autocancel]
          config-path: .circleci/continue.yml
```

**Pros:**

- Single cancellation point for all workflows
- Ensures clean slate before new workflows start
- Simpler configuration

**Cons:**

- May cancel workflows from different features/PRs on same branch
- Less granular control

### Complex Example with Multiple Conditions

For workflows that need to cancel specific patterns:

```yaml
jobs:
  smart-autocancel:
    docker:
      - image: cimg/node:22.18
    steps:
      - run:
          name: Smart autocancel
          command: |
            npm install -g circleci-autocancel

            # Cancel only workflows matching specific patterns
            # and preserve certain critical workflows
            if [[ "$CIRCLE_BRANCH" == "main" ]]; then
              # On main branch, only cancel same workflow type
              circleci-autocancel \
                --workflow-name "$CIRCLE_WORKFLOW_NAME" \
                --max-pages 5 \
                --verbose
            else
              # On feature branches, cancel all workflows
              circleci-autocancel \
                --name-pattern ".*" \
                --max-pages 3 \
                --verbose
            fi
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
