export const walkthroughs = [
  {
    slug: "first-note", title: "Bring your first note", description: "Start with a document, a connected source, or an idea you want to keep.", href: "/notes/import", action: "Import a note",
    steps: [
      { title: "Choose your source", text: "Open Notes > Import. Upload a supported document, paste text, or choose Connected sources for Google Drive and Notion. Connect your own account in Settings first if needed." },
      { title: "Review what was extracted", text: "Check the title, headings, tables, and figures before saving. A PDF's extracted text may omit graphics. Use the AI/OCR prompt with the original PDF when you need to reconstruct figures." },
      { title: "Make it yours", text: "Save the note, then choose Edit. Use the formatting toolbar for headings, lists, tables, cards, and diagrams. Split view shows the source beside the rendered result." },
      { title: "Keep your changes", text: "Choose Save changes or enable auto-save in Settings. Check the saved status before leaving. The Export menu lets you keep an independent copy." },
    ],
  },
  {
    slug: "study", title: "Turn material into practice", description: "Create a study guide and find out what you remember.", href: "/library", action: "Open your library",
    steps: [
      { title: "Begin with a source note", text: "Open a note and choose Build reviewer. Tell the helper what depth and style you want. Visual & Creative emphasizes explanatory diagrams; other styles prioritize the information." },
      { title: "Choose how to generate", text: "Use the provided AI connection or a personal connection from Settings. You can also copy a prompt into another AI tool and paste its answer back. Review the facts and diagrams before saving." },
      { title: "Test an idea", text: "Choose Create quiz from your source or study guide. Select question count, difficulty, and quiz mode. Explanations help you understand why an answer was right or wrong." },
      { title: "Return when it matters", text: "Open Practice to review flashcards and study progress. Use your results to decide what needs another pass. AI-generated questions can be wrong; compare them with your original material." },
    ],
  },
  {
    slug: "workspaces", title: "Create together in a workspace", description: "Draft several notes, build SVGs, and collaborate for three days.", href: "/workspaces", action: "Open workspaces",
    steps: [
      { title: "Name your shared desk", text: "Open Workspaces and describe what you are working on. A first note is created for you. Every workspace expires exactly 72 hours after creation; editing does not renew it." },
      { title: "Write and build visuals", text: "Add up to 20 notes using the sidebar. Use the Memoria editor's formatting tools and Split preview. The SVG helper asks what you want to add, which facts to include, and whether to send the current note as context. Generate a visual or copy its prompt, then review and insert the result." },
      { title: "Invite collaborators", text: "Open People & sharing. Enter an existing Memoria account's email and grant view or edit access, then send them the workspace link. The link alone grants no access. Invitees also find the workspace in their own workspace list." },
      { title: "Keep everyone's edits", text: "Saved changes sync every five seconds while the workspace is open. Collaborators can work on different notes or the same note. If saves overlap, Memoria preserves your draft and shows the newer version for review. Load their version or merge it into your draft before saving. This is saved-update collaboration, without live cursors or keystroke merging." },
      { title: "Take your work with you", text: "Before the displayed deadline, export all saved notes as a ZIP or download the current draft as Markdown. Unsaved drafts are not included in the ZIP. Expired workspaces cannot be opened or edited and are removed by cleanup. Copies you export remain yours." },
    ],
  },
  {
    slug: "sharing", title: "Share and export confidently", description: "Choose who can see your work and keep a copy outside Memoria.", href: "/notes", action: "Open your notes",
    steps: [
      { title: "Choose your audience", text: "From a note, open Share to create a view-only public link or invite an existing user as an editor. A public link can be opened without an account. Private workspace invitations require an account." },
      { title: "Review permissions", text: "Check the people listed in the sharing dialog. Remove access or disable a public link when it is no longer needed. Books have their own sharing and export settings." },
      { title: "Export what you need", text: "Open Export beside the resource actions and choose an available format. Larger PDF and Word exports show progress while they are prepared. Wait for completion and check your browser's downloads." },
      { title: "Stay in control", text: "Settings lets you disconnect external accounts, export account data, and delete your account. Disconnecting Drive or Notion keeps imported notes; delete those separately if you no longer want them." },
    ],
  },
];
