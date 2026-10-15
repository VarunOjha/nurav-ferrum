# Manual checklist for the end of P4 (security)

The automated checks cover what a robot can judge. These checks need a person and real websites. The owner does them
on the **release build the P4 gate made** at the end-of-phase review. Claude copies the answers, in the owner's words,
into `wiki/raw/evidence/phase-p4-security/manual-checklist.md` (the phase page's gate list).

**Before you start:** close your own Ferrum (the one started from `target\release`). The new build uses the same data
folder and different browser settings (SmartScreen on), so the two cannot run at the same time. Your tabs, history and
bookmarks carry over. **One-way step:** this build saves your settings in a newer format (version 4, p4.20) the first
time it saves anything (an answer to the permission question, or Settings). Your old Ferrum cannot read that format: it
would start with the standard settings and leave the file alone. So after this check, keep using the new build (or a
new release build). Then start the gate's build from the repo folder:

```powershell
& ".\target\gate-release\release\ferrum-desktop.exe"
```

## From the P4 plan

| # | What to do | What should happen | Result (yes / no + note) |
|---|---|---|---|
| 1 | Read the threat model and the **"Not enforced"** list in `SECURITY.md` (the sections "Threat model" and "Not enforced"). | You accept what Ferrum does **not** protect against, or say what must change. | |
| 2 | Open **Settings** (⚙ or Ctrl+Comma), add a site you can test (for example `example.com`) under **Blocked sites**, Save. Type that address; then open another site with a link to it and click the link. | Both times the page does not open and the toolbar says it is blocked. | |
| 3 | On a real site, ask for your **camera or location** (for example a map site's "show my location"). Click **Never allow**. Then, on another site that wants your location or microphone, click **Allow this time**. | Ferrum's bar asks first ("*site* wants to …"). After **Never allow** the site is refused, the camera light stays off, and Settings shows "never" for that site (untick it there if you like). After **Allow this time** the site works; after you leave the site and come back, it asks again. | |

## New in P4 (SmartScreen, downloads)

| # | What to do | What should happen | Result |
|---|---|---|---|
| 4 | **Download a program** you trust (for example an installer from its maker's site). | Microsoft's download pop-up appears; after **Keep** the download finishes; Ferrum's download line shows it with "Program file: open it only if you trust the site". Nothing is opened by itself. | |
| 5 | Open `https://demo.smartscreen.msft.net/phishingdemo.html` (Microsoft's harmless demo page). | Ferrum shows "Unsafe site blocked: Microsoft Defender SmartScreen reported this site as unsafe", with no "Try again". | |

When you are done, tell Claude the results in your own words (yes / no and anything odd), item by item. Afterwards
keep using this build (see "One-way step" above).
