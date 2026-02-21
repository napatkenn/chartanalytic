# Fly Cron Manager setup for chartanalytic

Machines run **only at schedule time** and stop when the job finishes (no 24/7 process).

## 1. Deploy the chartanalytic-cron image (once)

From the **chartanalytic** repo root:

```bash
flyctl deploy
flyctl scale count 0
flyctl secrets set OPENAI_API_KEY=sk-... POLYMARKET_PRIVATE_KEY=0x...
```

This pushes the image to `registry.fly.io/chartanalytic-cron:latest` and keeps **zero** machines running.

## 2. Deploy Cron Manager (separate app)

Clone and deploy [fly-apps/cron-manager](https://github.com/fly-apps/cron-manager):

```bash
git clone https://github.com/fly-apps/cron-manager.git
cd cron-manager
flyctl apps create chartanalytic-cron-manager
flyctl secrets set FLY_API_TOKEN=$(flyctl auth token)
```

Copy this repo’s schedule config into cron-manager:

```bash
cp /path/to/chartanalytic/cron-manager/schedules.json ./schedules.json
```

Deploy Cron Manager:

```bash
flyctl deploy
```

## 3. Schedules (in `schedules.json`)

| Name                     | Schedule           | Command                              |
|--------------------------|--------------------|--------------------------------------|
| chartanalytic-polymarket | :00, :15, :30, :45 | `node social-agent/run.js --predict` |
| chartanalytic-social     | 7, 12, 15, 17, 20 UTC | `node social-agent/run.js`        |

Cron Manager starts a machine in **chartanalytic-cron** at each of these times, runs the command, then the machine exits and is destroyed. No machine runs between schedules.

## 4. Update region/image if needed

In `schedules.json`, change `"region"` to your preferred Fly region and ensure `"image": "registry.fly.io/chartanalytic-cron:latest"` matches your app name. After editing, redeploy Cron Manager: `flyctl deploy` from the cron-manager repo.
