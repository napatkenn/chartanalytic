# Deploying to Vercel (Windows / OneDrive)

The Vercel CLI can fail on Windows with **"Missing files"**, **EPERM (symlink)** or **readlink** errors when your project is in OneDrive. Use **Git-based deploy** instead.

## Recommended: Deploy via GitHub + Vercel Dashboard

1. **Push your code to GitHub** (if not already).
   ```bash
   git add .
   git commit -m "Deploy"
   git push origin main
   ```

2. **In Vercel:** [vercel.com](https://vercel.com) → Dashboard → **Add New** → **Project** → Import your GitHub repo (`chartanalytic`).

3. **Configure:**
   - Framework: Next.js (auto-detected)
   - Root Directory: leave default
   - Add **Environment Variables** (from your `.env`): `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, etc.

4. **Deploy.** Vercel builds on Linux — no symlink or OneDrive issues.

5. After the first deploy, set **Production** env vars in Project → Settings → Environment Variables (and optionally pull them locally with `vercel env pull`).

---

## If you still want to use the CLI

- **Enable Developer Mode** (Windows): Settings → Privacy & security → For developers → **Developer Mode** = On (allows symlinks without admin).
- **Run from a folder outside OneDrive**, e.g. `C:\dev\chartanalytic` (copy repo there, then `vercel build` and `vercel deploy --prebuilt --prod`).
- Before `vercel build`, delete `.next`: `Remove-Item -Recurse -Force .next` to avoid readlink errors during Next.js clean.
