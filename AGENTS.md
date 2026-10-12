<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Website architecture
- Use the root route for shared navigation and footer, with separate leaf routes for each public page so every page is directly shareable.
- Keep visual tokens and reusable layout classes in src/styles.css so the website maintains a consistent design.
- Contact enquiries are prepared locally without sending or storing data until a real business contact destination is supplied.
