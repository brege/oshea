### Plugin / Collection Purge -- Orphan Cleanup?

**Status:** Deferred from v0.8.8, to be considered for a major release (v1.x or later)

> **Historical Note:** This document explains the decision to defer a "purge" command for cleaning up orphaned files, a feature considered during the v0.8.8 development cycle. As noted in the changelog, the feature was postponed due to concerns for user data integrity, prioritizing safety over convenience.

**1. Overview of the Feature Concept** \
The proposed "purge" functionality aimed to provide a comprehensive cleanup mechanism within the `md-to-pdf` Collections Manager. This would extend beyond simple `collection remove` by identifying and deleting truly "orphaned" files or directories within the tool's managed collections root (`~/.local/share/md-to-pdf/collections/`) that are not recognized as part of any active or valid managed collection or plugin. It also intended to offer a more aggressive removal option (e.g., `--purge`) for managed entities.

**2. Rationale for Deferral (The Argument for Sapience)** \
The decision to defer this feature, despite its appeal for tidiness, is rooted in paramount concerns for **user data integrity and system robustness**. A "purge" operation carries significant, irreversible risks if not implemented with absolute precision. Our discussions revealed several critical points:

  * **Ambiguity of "Orphan" & "Plugin" Definition** \
    Before deletion, the system must infallibly distinguish between a legitimate managed entity (even one with a missing original source) and truly untracked, irrelevant "debris." Our current protocol for defining a "plugin" or "collection" for management, while improving, is not yet "Debian/BSD grade good" enough to guarantee no false positives, especially with malformed user inputs or unexpected directory structures.

  * **High Risk of Accidental Data Loss** \
    `md-to-pdf` processes documents and potentially references images – data that for many users is not regularly backed up and is often irreproducible. 

    An erroneous `purge` operation, even if confined to `~/.local/share/md-to-pdf/collections/`, could theoretically lead to the deletion of user-generated content if it were mistakenly identified as an "orphan" or if user-provided paths were misconstrued.

  * **Lack of Sufficient "Fences" (Protective Jails)** \
    While `md-to-pdf`'s operations are contained within `this.collRoot`, the internal validation for what *within* that root constitutes a safe target for deletion (beyond simple `remove` operations) requires more stringent "fences." Accidental `rm -rf` on an unintended sub-path within the managed root, particularly with user-supplied strings, poses too high a risk.

  * **Maturity Milestone, Not Urgent Necessity** \
    Manual cleanup of the `~/.local/share/md-to-pdf/collections/` directory (if issues arise) remains a viable, albeit less convenient, option for users. The benefit provided by an automated `purge` does not currently outweigh the potential for catastrophic failure.
  
    This feature could represent a "maturity milestone" –- something to be implemented when the system's foundational understanding of managed entities is ironclad, and the codebase's file system interaction is hyper-hardened.
    Many steps must be made before heading pell-mell into this feature.

**3. Safe Implementation**

Screwing this up will get you raked over the coals by Debian and BSD maintainers.

Should this feature be revisited in a post-1.0 major release, the following structures and considerations would be critical:

Every managed collection and plugin must possess explicit, unique, and verifiable markers (e.g., specific metadata files like `.collection-metadata.yaml` for collections, `plugin-id.config.yaml` for plugins) that act as an "attestation of management."

**Strict, declarative, markers** that define what a plugin actually *is* would first need to be established.
Only entities bearing these valid attestations within the `collRoot` can be touched by core management operations. Anything else is explicitly unmanaged.


An **Incremental "Orphan" Identification** system to stage orphans in a countable manner, instead of an immediate "purge," could allow us to make progress toward this goal.

An example of a multi-stage process could be: 
  
  1.  **`collection audit orphans` (or similar):** A command that *only* identifies and lists potential "orphans" (files/directories within `collRoot` without valid attestations), providing verbose explanations and pathing, without any deletion.
    
  2.  **`collection purge --confirm-orphans`:** A separate, highly-guarded command that takes the output of the `audit` command and, with explicit user confirmation, deletes *only* the identified orphans.

**4. Conclusion** \
While the concept of automated "purging" is appealing, the current stage of `md-to-pdf`'s maturity and the inherent risks to user data necessitate its deferral. This allows me to focus on solidifying core functionalities and building an unassailable foundation of safety and reliability, paving the way for more advanced, and critically, *safer*, cleanup features in the future.

