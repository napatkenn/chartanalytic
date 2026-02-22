# Running the Polymarket cron from non-blocked regions

[Polymarket restricts order placement](https://docs.polymarket.com/api-reference/geoblock) from many countries (including the **US**, UK, Germany, Australia, etc.). If your **Render cron** (or other host) runs in a blocked region, the Polymarket job can fail with "Trading restricted in your region". The **Social cron** (X posting only) is not affected by Polymarket’s geoblock.

Below are **free or low-cost** ways to run the Polymarket cron from an allowed region.

---

## Option 1: Render + HTTP proxy (easiest)

Use **Render** cron jobs and send **all outbound HTTP/HTTPS** (including the [geoblock check](https://docs.polymarket.com/api-reference/geoblock) and Polymarket API) through a proxy in an **allowed** country.

**Only HTTP proxies are supported** (not SOCKS4/SOCKS5). Use a proxy URL like `http://host:port`.

1. Get an **HTTP** proxy whose exit IP is in an allowed region. Polymarket’s docs mention **eu-west-1** (Ireland) as a non-georestricted region; other allowed countries include Netherlands, Spain, Canada (outside Ontario), etc.
2. In the **Render Dashboard**: open your **polymarket-cron** service → **Environment** → add **`PROXY_URL`** = your proxy URL, e.g. `http://user:pass@host:port` or `http://host:port`.
3. The social agent uses `PROXY_URL` (via global-agent) so geoblock check, Gamma, and CLOB requests go through the proxy.

**Proxy options (examples, not endorsement):**

- Paid VPN/proxy providers that let you choose exit country (e.g. EU).
- **Free tier / trial**: some VPN or proxy services offer a short trial or limited free tier with EU exit; you’d run a small proxy server there and set `PROXY_URL` to it.
- **VPS as proxy**: spin up a tiny VPS in Ireland/Netherlands (see Option 2) and run a simple HTTP proxy (e.g. Squid, or a minimal Node proxy); then set `PROXY_URL` in Render to that server.

---

## Option 2: Cron on a free VPS in an allowed region

Skip Render for the Polymarket job and run **cron** (or a systemd timer) on a small VM in an allowed country.

1. **Free-tier VPS** in a non-blocked region, for example:
   - **Oracle Cloud Free Tier**: [Always Free VM](https://www.oracle.com/cloud/free/) — choose a region that is **not** in [Polymarket’s blocked list](https://docs.polymarket.com/api-reference/geoblock) (e.g. **Amsterdam**; avoid Frankfurt if it’s Germany).
   - **Google Cloud** or **AWS** free tier: create a small instance in an allowed region (e.g. Belgium, Netherlands, Ireland).
2. On the VM: install Node.js 20, clone your repo, `npm ci`, and create a cron job:

   ```bash
   # Every 15 minutes (Polymarket)
   0,15,30,45 * * * * cd /path/to/chartanalytic && /usr/bin/node social-agent/run.js --predict
   ```

3. Put secrets in a `.env` file on the VM (or use a secrets manager). Do **not** commit `.env`.
4. Optionally keep **Render** only for the **Social** cron (X posting), which is not geoblocked.

---

## Summary

| Method                    | Cost        | Effort | Notes                                            |
|---------------------------|------------|--------|--------------------------------------------------|
| **Render + PROXY_URL**    | Proxy cost | Low    | Set one env var; proxy must be in allowed region.|
| **Cron on free VPS**      | Free tier  | Medium | e.g. Oracle Cloud in Amsterdam; no Render needed for Polymarket. |

**Reference:** [Polymarket – Geographic Restrictions](https://docs.polymarket.com/api-reference/geoblock) (blocked countries and regions, geoblock endpoint, eu-west-1 as non-georestricted region).
