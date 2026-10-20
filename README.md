# Connor'sSimpleChecklists

Interactive checklists with built-in versions (3/5/7-day trip, full or partial beach day, and so on). You can share a list live with other app users, or send it by text or email.

Built on the same stack and folder layout as OmniPath Nutrition: **React 18 + Vite 5 + Tailwind 3 + Firebase (Auth + Firestore) + lucide-react + Capacitor 6**, deployed to GitHub Pages with the same workflow, and using the same five themes (Standard, Pretty, Manly, Beach Vibe, Circus).

## Setup

```bash
npm install
cp .env.example .env   # then fill in your Firebase values
npm run dev
```

- **Firebase**: needed for login, cloud sync and share codes. Without it the app runs in **guest mode**: checklists are saved in the browser, and text/email sharing still works.
  1. Create a Firebase project and add a Web app. Copy its config into `.env`.
  2. Turn on **Authentication → Email/Password** and **Google**.
  3. Create a **Firestore** database.
  4. **Deploy the security rules once**: `firebase deploy --only firestore:rules`, or paste `firestore.rules` into Firebase console > Firestore > Rules. Sharing won't work until you do.
  5. Add your deployed domain (e.g. `you.github.io`) under Authentication → Settings → Authorized domains.
- **GitHub Pages deploy**: add the same `VITE_*` values as repository secrets. `deploy.yml` reads them from there.
- **Mobile (Capacitor)**: `npm run build && npx cap add ios` (or `android`), then `npm run cap:sync`. Set `VITE_PUBLIC_APP_URL` to your hosted URL so join links sent from the app point somewhere people can open.

> `.env` must never be committed. Restrict your Firebase API key to your domains in Google Cloud Console.

## Features

- **Interactive checklists**: tap to check items off. Items are grouped by section, have per-version quantities (e.g. Shirts ×5), a progress bar, a "hide completed" toggle, and a quick-add box.
- **Top-level dashboard**: every checklist as a card showing progress, its current version, and whether it's shared. Includes search, All / Mine / Shared filters, sorting, and summary stats. You can switch versions or reset a list right from its card.
- **Versions of the same list**: in **Edit**, add versions (e.g. 10-Day Trip, starting from the 7-day items). Each item chooses which versions it belongs to and how many to bring. Switching versions keeps your checks, so a toothbrush you've packed stays checked when you go from 3 to 5 days.
- **Reset**: the **Reset checklist** button (or the ↺ on a dashboard card) unchecks every item. It asks you to confirm first, and on a live shared list it resets for everyone.
- **Starter templates**: Travel Packing (3/5/7 day), Beach Day (full/partial), Camping Trip (overnight/weekend/week), House Cleaning (daily/weekly/deep). You can also start blank, or paste a list where a line ending in `:` starts a section.
- **Share with app users** (sign-in required), through a 6-character share code or join link:
  - **Live code**: whoever enters it joins *the same* checklist. Checks, resets and edits sync in real time. Checks are written field by field, so two people checking items at once never overwrite each other.
  - **Copy code**: whoever enters it gets *their own separate* copy, with nothing checked. The copy stays current with the owner's latest saved edits.
  - The owner can make a new code, turn a code off, or remove people. Collaborators can leave a list.
- **Share by text or email**: pick a version, optionally only the remaining items, optionally include a share code and join link. **Text** opens Messages, **Email** opens your mail app, plus **Copy** and the phone's native share sheet.
- **Themes**: same five themes and tokens as OmniPath (`src/assets/styles/themes.css`), plus themed progress bars. The theme is remembered per device and synced to your account.

## Data model (Firestore)

| Collection | Contents | Who can access |
|---|---|---|
| `users/{uid}` | theme | that user |
| `checklists/{id}` | title, emoji, `variants`, `items[].versions{variantId: {qty}}`, `checked{itemId: true}`, `members`, `memberNames`, `liveCode`, `copyCode` | read/edit: members · membership & codes: owner · join: anyone holding the current live code |
| `shareCodes/{CODE}` | `checklistId`, `mode` (`live`/`copy`), owner name, snapshot (copy mode) | look up by exact code: any signed-in user · list: nobody · write: owner |

Only display names are stored on shared lists. Email addresses are never written to checklists or share codes. Sign-up asks for a name to show to collaborators.

## Project structure

```
src/
  App.jsx                         routing between dashboard / list / editor, modals, auth
  config/firebase.js              Firebase init (guest mode when unconfigured)
  services/
    checklistService.js           picks the cloud or guest store
    dbService.js                  Firestore: checklists, live updates, share codes, join/copy
    localStore.js                 guest-mode localStorage store (same API)
    shareService.js               codes, text/email formatting, sms:/mailto: links
  utils/checklist.js              model helpers: versions, progress, sections, templates
  data/templates.js               starter checklists with versions
  components/
    auth/AuthModal.jsx
    ui/ThemeSwitcher.jsx, ui/Modal.jsx (Modal, ConfirmDialog, ProgressBar)
    checklists/Dashboard.jsx, ChecklistCard.jsx, ChecklistView.jsx, ChecklistEditor.jsx,
               VersionToggle.jsx, NewChecklistModal.jsx, ShareModal.jsx, JoinModal.jsx
  assets/styles/themes.css        the five themes + checklist components
```

## Notes and limitations

- Texts and emails use `sms:` and `mailto:` links. They open the device's own apps with the message filled in, and you choose the recipient there. Sending automatically without opening those apps would need a backend service (e.g. Twilio or SendGrid).
- Share codes are 6 characters with no look-alike letters, which allows about 887 million combinations. Turning a code off stops new people from joining, but anyone already on a live list stays until you remove them.
- A live list allows up to 50 people, 12 versions and 500 items, enforced in `firestore.rules`.
