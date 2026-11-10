# RouteLab

A mobile-first bouldering notebook, built with Vite, React and TypeScript. Milestone 1 implements the problem library and manual photo planner. Everything you add stays in your browser's IndexedDB. There are no accounts, backend, analytics, AI calls, or external database.

## Run locally

Use Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. For a production build:

```sh
npm test
npm run build
npx vite preview --host 0.0.0.0
```

## Milestone 1

- Create, edit, and delete problems with gym, freeform grade, wall style, date, status, photo, and notes.
- Search and filter a seeded library of three illustrative projects.
- Import JPEG, PNG, or WebP route photos (maximum 12 MB). Convert HEIC to JPEG before importing.
- Tap Add hold, then tap a photo to create markers. Select and drag markers, or use percentage inputs for accessible positioning. Mark Start, Hand, Foot, and Finish roles.
- Create, rename, duplicate, and delete planned sequences. Select a hold, choose LH/RH/LF/RF, then add a move. Reorder or remove moves. Deleting a hold removes its moves from every plan.
- Photo markers use normalized coordinates relative to the original, uncropped image; they adapt to screen size.
- Changes save locally. Deletion requires confirmation. Photos use temporary object URLs that are revoked when replaced or unmounted.
- Export a JSON backup containing metadata and base64-encoded original photos. Import validates schema, references, and media, then atomically replaces the local library. Import limit: 100 MB; base64 increases photo size by approximately one third. Export before importing.

The sample plans are illustrative and do not describe the holds in the bundled photograph. Replace them with your own route photos. Bundled climbing photograph: [Unsplash](https://unsplash.com/photos/1522163182402-834f871fd851), original image source `https://images.unsplash.com/photo-1522163182402-834f871fd851`.

## GitHub Pages

1. Create a GitHub repository and put this directory's contents at its root.
2. Push to the `main` branch.
3. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
4. The included `.github/workflows/deploy.yml` installs dependencies, runs tests, builds, and deploys `dist/`.
5. Open the deployment URL shown by the workflow.

Vite uses `base: './'` for repository subpaths. There is no client-side URL router requiring rewrites. Only source and built static assets are published; IndexedDB, imported photos, and downloaded backups are never included in deployment. The source repository is https://github.com/jock-rock/routelab. Enable GitHub Actions in the Pages settings before the first deployment.

## iPhone Safari testing

For local testing, connect iPhone and computer to the same Wi-Fi, run `npm run dev`, and open `http://<computer-LAN-IP>:5173` in Safari. For the most representative storage and security behavior, use the HTTPS GitHub Pages deployment. Local HTTP on a LAN may not provide secure-context features such as persistent storage requests or `crypto.randomUUID`; use HTTPS for full functionality.

Check at 375–430 px widths, portrait and landscape:

1. Create a project, import a portrait photo, edit fields, reload, and confirm persistence.
2. Add holds near every image boundary; drag them; rotate the phone and verify position stability. Use X/Y percentage fields with VoiceOver and keyboard access.
3. Build two plans with hand and foot moves, reorder them, switch plans, and reload.
4. Export to Files, delete a project, import the backup, and verify photo and plans return.
5. Try an unsupported file, oversized photo, and invalid JSON backup. The library should remain intact.
6. Turn on Airplane Mode while the app is open and continue editing. Reopening offline is **not guaranteed**: this milestone does not install a service worker or cache the application shell.
7. Test deletion confirmations, zoomed text, on-screen keyboard behavior, and VoiceOver navigation. Actual Safari and device testing is required; desktop emulation does not establish iPhone compatibility.

## Storage and privacy

Storage belongs to the current browser and origin. A different hostname, protocol, or port has a separate library. Safari can evict website data; private browsing and clearing history can delete it. Export regular backups, especially before changing origin or device. The storage dialog shows estimated usage and warnings at 80% quota, and offers a best-effort persistent-storage request. IndexedDB write failures surface an error; export your in-memory library before leaving. Photos are selected with the platform file picker; camera, microphone, and photo-library-wide permissions are not requested.

The app does not send personal data anywhere. The sample photo ships with the app. Typeface CSS currently uses Google Fonts; no project data is included in these requests, and system fonts work without a connection.

## Architecture and next milestones

- `src/domain.ts`: versioned data types, IDs, relationship validation, and cascading deletion.
- `src/storage.ts`: IndexedDB v1, blob persistence, transactional backup import/export.
- `src/main.tsx`: library and application shell; `Planner.tsx`, `ProblemForm.tsx`, and `Photo.tsx` isolate planner interactions, project editing, and photo URL lifecycle. Only domain and storage modules manage data contracts.
- `src/style.css`: responsive touch interface and reduced-motion support.
- `src/*.test.ts`: domain invariants and real IndexedDB API behavior through fake-indexeddb.

`Problem`, `Hold`, `Sequence`, `Move`, `ScanAsset`, `Attempt`, `VideoBookmark`, and `Review` are defined. Future migrations must explicitly upgrade both the IndexedDB version and JSON schema, preserving IDs and relationships. The current importer intentionally rejects future-module records until their validation is implemented.

2. **3D viewer:** local GLB/GLTF import, preserve source files and dependencies, orbit/pan/zoom/reset, unlink and object URL cleanup.
3. **Video review:** size-constrained local video, speed and frame controls, bookmarks, side-by-side plan comparison and manual notes.
4. **Journal:** reason for fall, correction, outcome, issue categories, counts and trends.

Later modules appear as labeled roadmap screens. No automatic hold recognition, pose estimation, AI diagnosis, or generated coaching advice is implemented. Add future analysis behind a separate provider interface; the manual planner and local store should remain usable independently.
