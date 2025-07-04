### Release Candidate Checklist


#### Documentation Checklist [ `docs/` ]

**State** is interpreted as *Urgency*, *Difficulty*, or *Completeness*

| ● | State   | Document                                | Notes                                 |
|:-:|:--------|:----------------------------------------|---------------------------------------|
|   |         | [ **Phase 1** ]                         | **Foundational Update**               |
| ✔ | Now     | **`guides/plugin-development.md`**      | Rewrite completely                    |
| ✔ | Now     | **`refs/cheat-sheet.md`**               | Modernize - doubles as *smoketester*  |
| ✔ | Medium  | **`plugins/README.md`**                 | Modernize                             |
| ✔ | Low     | **`refs/plugin-contract.md`**           | Consistency                           |
| ✔ | Auto    | **`scripts/index.md`**                  | `node scripts/docs/update-scripts.js` |
|   |         | [ **Phase 2** ]                         | **Strategic Synthesis**               |
| ‖ | **New** | **`docs/dream-board-v0.10.md`**         | Retrospect of reorg + new priorities  |
| ✔ | Low     | **`test/README.md`**                    | Modernize                             |
| ✔ | Low     | **`docs/reorganization-planner.md`**    | Move to `docs/archive/v0.10/`         |
|   |         | [ **Phase 3** ]                         | **Future-Facing Content**             |
| ‖ | **New** | `docs/guides/`+`test/e2e/walkthroughs/` | Rearrange `e2e`, lifecycles           |
| ✔ | **New** | `docs/ai/`                              | AI specification documents**          |
|   |         | [ **Phase 4** ]                         | **Indexing & Navigation**             |
| ✔ | Later   | `docs/index.md`                         | Organize by section                   |
| ✔ | Later   | `test/README.md` → `test/index.md`      | Retool for consistency                |
| ✔ | **New** | `scripts/refactor/index.md`             | Recursive indexing + delegation       |
| ✔ | **New** | `plugins/README.md` → `plugins/index.md`| Script and modernize                  |
| ✔ | **New** | `scripts/update-project-indices.js`     | Unified Tool 'n Doc Index Script      | 
|   |         | [ **Phase 5** ]                         | **Marketability & Concision**         |
| ○ | Finish  | **`README.md`**                         | **Update for v0.10**                  |

At the onset of the above task table, all documents were in a v0.9.00 state and need to be updated to v0.10.x state. 

Highly recommend this unified script for indexing the project. This would be my **librarian**.

#### Repo Health

These are internal, code-hygiene tasks.

| ● |     | Task Description                                                 |
|:-:|:----|:-----------------------------------------------------------------|
| ✔ | pR  | **Pathing & Dependency Management**                              |
| ✔ | pR1 | Build a centralized pathing registry.                            |
| ✔ | pR2 | Implement module aliases for safer, faster refactoring.          |
| ✔ | pR3 | Strengthen `require()` path robustness with a pathing registry.  |
| ✔ | pR4 | Tie registry to module aliases for resilient dependencies.       |
|   |     |                                                                  |
| ○ | Td  | **Debugging & Telemetry**                                        |
| ○ | Td1 | Enhance test suite with clear, actionable error feedback.        |
| ○ | Td2 | Ensure failures pinpoint root cause and module under test.       |
| ○ | Td3 | Develop a structured debugging system.                           |
| ○ | Td4 | Support verbosity levels and context-rich output on failure.     |
|   |     |                                                                  |
| ● | Tb  | **Test Suite Structure**                                         |
| ○ | Tb1 | Consolidate atomic test files into manifest-driven harnesses.    |
| ○ | Tb2 | Reduce boilerplate and improve test suite maintainability.       |
| ○ | Tb3 | Ensure tests are transparent and immediately reveal problems.    |
| ○ | Tb4 | Minimize debugging effort required for the test suite itself.    |
|   |     |                                                                  |
| ● | PM  | **Plugin Management**                                            |
| ○ | PM1 | Automatically register plugins from the plugins directory.       | 
| ○ | PM2 | Eliminate need for explicit paths in `config.example.yaml`.      |
| ○ | PM3 | Restore compatibility with D3.js slide plugin.                   |
| ○ | PM4 | Explore smarter resource loading via dedicated Node package.     |
| ○ | PM5 | Re-evaluate hardness in `pdf_generator` for flexibility and fun. |
|   |     |                                                                  |
| ✔ | tC  | **Tab Completion Errata**                                        |
| ✔ | tC1 | Prevent tab completion errors from blocking core operations.     |
| ✔ | tC2 | Decouple completion errors from state-changing commands.         |
| × | tC3 | Optimize system path completion for zero perceived delay.        |
| × | tC4 | Hand off dynamic content earlier for smoother experience.        |

<!--
✔ = Complete
● = In Progress
○ = Open
× = Wontfix
‖ = Paused
-->


