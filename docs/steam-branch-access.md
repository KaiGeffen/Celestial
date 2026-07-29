# Steam dev-1 branch — team access

Goal: let teammates install and auto-update the latest build pushed via
[upload-to-steam.sh](../electron/upload-to-steam.sh), before the store page
is public.

Every run of that script uploads to the `dev-1` beta branch (`app_build_4670650.vdf`
has `SetLive "dev-1"` — see the script's header comment). The `dev-1` branch
has no password, but the app itself isn't publicly listed yet, so each
teammate needs to be granted access individually.

## One-time setup (Kai, per teammate)

1. Steamworks → **Playtest** (App Admin for Celestial, app id `4670650`).
2. Invite each teammate by their Steam account (or approve their playtest
   request if they request access via a shared playtest link).
3. Nothing else to configure per-teammate — the `dev-1` branch has no
   password, so anyone with playtest access can select it once they've
   accepted.

## For teammates

1. Accept the playtest invite (email or Steam notification) — this adds
   Celestial to your Steam library.
2. Install Celestial from your Steam library.
3. Right-click **Celestial** → **Properties** → **Betas** tab.
4. In the dropdown, select **dev-1** (no password required).
5. Steam downloads the `dev-1` build. Future uploads to that branch auto-update
   the next time Steam checks for updates — no need to re-opt-in.

To go back to the public branch later, reopen Properties → Betas and select
**None** (or **default**, depending on Steam's current UI wording).
