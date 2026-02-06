# Fixes

## npm/npx blocked: "running scripts is disabled"

PowerShell is blocking `npm.ps1` and `npx.ps1`. Use **Command Prompt** for these commands, or run them via `cmd /c` in PowerShell.

**Option 1 – Run via cmd (copy and paste in PowerShell):**

```powershell
cmd /c "cd /d c:\Users\knapa\OneDrive\Desktop\chartanalytic && npm exec -- prisma generate"
cmd /c "cd /d c:\Users\knapa\OneDrive\Desktop\chartanalytic && npm exec -- prisma db push"
cmd /c "cd /d c:\Users\knapa\OneDrive\Desktop\chartanalytic && npm run dev"
```

**Option 2 – Allow scripts (once per machine, then npm/npx work normally):**

Open PowerShell **as Administrator**, then run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

After that, close and reopen your terminal; `npm` and `npx` will work without `cmd /c`.

---

## npm install fails (OneDrive / locked files)

Your project is in **OneDrive** (`OneDrive\Desktop\chartanalytic`). OneDrive can lock files and cause:
- `ENOTEMPTY` / `EPERM` when deleting `node_modules`
- `ENOENT` / `spawn cmd.exe ENOENT` during `npm install`

## Recommended: Move project out of OneDrive

1. **Copy the project** to a folder **not** synced by OneDrive, for example:
   - `C:\Users\knapa\chartanalytic`
   - or `C:\dev\chartanalytic`

2. **Copy everything except `node_modules`** (so you don’t copy the broken folder):
   - In File Explorer: copy the whole `chartanalytic` folder to the new location, then **delete the `node_modules` folder** inside the new copy (if it was copied).

3. **Open the new folder in Cursor** (File → Open Folder → select the new path).

4. **In the terminal** (in the new folder):
   ```powershell
   npm install
   npx prisma generate
   npx prisma db push
   npm run dev
   ```

5. Keep your **`.env`** in the new folder (copy it from the old project if you didn’t copy the whole folder).

---

## If you must stay in OneDrive

1. **Pause OneDrive** (right‑click OneDrive in the taskbar → Pause syncing → 2 hours).
2. **Close Cursor** completely.
3. In **File Explorer**, delete the `node_modules` folder inside `chartanalytic` (and `package-lock.json` if you want a fully clean install).
4. Reopen Cursor, open the project, and in the project folder run:
   ```powershell
   npm install
   ```
5. If it still fails, move the project out of OneDrive as above.
