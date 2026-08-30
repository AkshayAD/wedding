# Database package

This folder defines the planned Supabase database boundary. It has not been applied to a Supabase project.

Apply in this order:

1. `schema.sql`
2. `policies.sql`
3. `functions.sql`

The current functions implement room creation, safe lobby lookup, seat claiming, and an authorized refresh snapshot. The schema separates public rooms/players/events from private roles/actions/night state and includes unrevealed Witch-card counts, Constable availability, and the public winner. Night mutations remain intentionally ungranted until their transactional functions and deny-path tests are implemented during the backend milestone.

Before production:

- Enable anonymous sign-ins and abuse protection/CAPTCHA appropriate to the deployment.
- Add the required tables to the Supabase Realtime publication, excluding `salem_player_roles`, `salem_secret_actions`, and `salem_night_state` from broad room subscriptions.
- Implement the mutation functions listed at the end of `functions.sql`.
- Validate Witch cards by count, not by number of Witch players; one player may hold both cards.
- Apply death, role reveal, victory, and phase changes in the same locked transaction.
- Test every function as host, eligible player, ineligible player, stale phase, dead player, and non-member.
- Schedule expiry cleanup for completed/expired rooms.
- Put only the project URL and publishable key in the browser configuration.
