# Should I have used a config library?

> **Historical Note:** This document was written as a reflection on the project's earlier architectural development (circa v0.6), exploring the trade-offs of the bespoke configuration system (`ConfigResolver`, `PluginRegistryBuilder`) v. using standard libraries.

## The illure of implementing a config library in `md-to-pdf`

As a first major Node.js project, it is probably obvious to the seasoned pro that a bespoke configuration system like the one in `md-to-pdf` (particularly within `ConfigResolver.js` and `PluginRegistryBuilder.js`), would naturally make one wonder why there wasn't a pull towards established configuration libraries available in the ecosystem. In short, it simply never crossed my inexperienced mind.  At least, not until after substantial work went into implementing what *I thought* was standard practice began greedily gobbling up a lion's share of debug time. 

The existing system, while more powerful and tailored than simple systems I've made in the past for things like **LaTeX** and **Gnuplot**, represents a significant amount of custom code dedicated to loading, merging, and resolving settings from various YAML files across multiple tiers (Bundled, XDG, Project-specific). What's more, this cascade of logic is also present in the implentations for plugin handlers and, thricely, stylesheets. Oh, if only it was so simple as the latter.. So, the temptation arises from the promise that a standard library could abstract away common, repeating complexities, potentially reducing the custom codebase and aligning with more conventional Node.js practices.  That would promise, maybe, a marked improvement on a process that's better understood by true experts.

Standard libraries like `config` (by LocusLabs/lorenwest), `convict`, or even simpler ones like `rc`, generally offer several advantages:

* **Simplified File Loading:** They handle the boilerplate of finding and reading configuration files from multiple conventional locations (e.g., `./config/default.yaml`, `./config/production.yaml`, `~/.config/<appname>/config.yaml`) and often support various formats (JSON, YAML, JS, environment variables) out of the box.
* **Standardized Merging:** They provide well-tested deep merging of configuration objects from different sources.
* **Environment Variable & CLI Integration:** Many offer straightforward ways to override configurations via environment variables or command-line arguments.
* **Community Vetting:** The core loading and parsing logic is maintained and scrutinized by a broader community.
* **Reduced Boilerplate:** Less custom code might be needed for the basic tasks of identifying, loading, and parsing configuration files.

Given the system's current reliance on YAML and its multi-layered approach for *main* configuration files (Bundled, XDG, Project via `--config`), a library like `config` might seem initially appealing due to its cascading load order. If schema validation were a primary immediate goal, `convict` would be a strong contender as it's built around defining and enforcing a schema.

## The Case Against an Immediate Refactor

Despite the general benefits of standard libraries, a refactor of `md-to-pdf`'s configuration system towards one of them, at least as a high priority, is arguably ill-advised. The current system, while intricate, is deeply tailored to the specific and quite unique needs of `md-to-pdf`'s plugin architecture and asset management.

Consider the core complexities that are *not* standard features of most off-the-shelf configuration libraries:

1. **Dynamic Plugin Configuration & Registration.**\
   The system dynamically discovers plugins by parsing `plugins` sections in main configuration files, resolving paths (including custom `plugin_directory_aliases`) to individual plugin `*.config.yaml` files, and then loading these. Standard libraries typically load a predefined set of files at startup.

2. **Contextual Inline Overrides.**\
   The "Beets-inspired" mechanism where top-level keys in a main configuration (e.g., a `cv:` block in `project-config.yaml`) provide overrides for a specific plugin is a highly custom merge logic. A generic library would merge the `cv:` block, but the interpretation that this specifically targets the `cv` *plugin's already loaded settings* is application-specific.

3. **Path Resolution for Assets.**\
   A critical feature is that asset paths within plugin configurations (like `css_files`) are resolved relative to the *directory of the specific configuration file that defines them*. This contextual path resolution is beyond the scope of typical configuration value loading.

4. **`--factory-defaults` Behavior.**\
   The ability to completely bypass user and project configurations is a specific command-line driven mode of operation that would need to be implemented on top of any standard library.

Attempting to use a library like `config` would likely mean it handles only the initial loading of the three main `config.yaml` tiers. The bulk of the logic in `ConfigResolver.js` and `PluginRegistryBuilder.js`—which deals with interpreting these loaded structures to find plugins, apply specific override patterns, and manage paths—would still be necessary, albeit refactored. The reduction in custom code might be less significant than hoped, while the current system, born out of evolving needs, directly addresses these domain-specific problems.

```
[Current System: Manual Load & Bespoke Logic]
  cli.js
    -> ConfigResolver.js
        -> _loadPrimaryMainConfig()  (manual YAML load: Project/XDG/Bundled)
        -> PluginRegistryBuilder.js
            -> _getPluginRegistrationsFromFile() (manual YAML load for plugin paths)
        -> getEffectiveConfig(pluginName)
            -> _loadSingleConfigLayer() (manual YAML load for plugin's own config)
            -> Applies inline overrides (custom logic)
            -> Resolves asset paths (custom logic)

[Hypothetical System with `config` Library]
  cli.js
    -> `node-config` (loads Project/XDG/Bundled main configs into one object)
    -> AdaptedConfigResolver.js
        -> Consumes object from `node-config`
        -> PluginRegistryBuilder.js (largely the same, parses `plugins` from the object)
        -> getEffectiveConfig(pluginName)
            -> Still needs to load plugin's own *.config.yaml (could use `node-config` instance or manual)
            -> Applies inline overrides (custom logic on `node-config` object)
            -> Resolves asset paths (custom logic)
```
As illustrated, the custom logic for plugin discovery, interpretation of inline overrides, and especially the context-aware asset path resolution, remains.

## Coupling with Schema and Project Hardening

The discussion of refactoring the configuration loading mechanism is naturally tied to the potential introduction of configuration schema validation, a feature noted for a future "System Hardening & Finalization" phase (v0.9.0) in the project roadmap and initially proposed for v0.5.0. Introducing a schema would define a clear contract for all configuration files, especially for plugin authors and users customizing them. The benefits for `md-to-pdf` would be significant: improved reliability by catching configuration errors early, clearer error messages for users, and enhanced maintainability as the expected structure of configurations (global, plugin-specific, overrides) would be explicit. The primary downside, beyond the initial effort to write and integrate schemas (perhaps using a library like Ajv, as previously considered), is a potential increase in rigidity; malformed or experimental configurations would be more strictly rejected.

A refactor to a library like `convict` *would* inherently bring schema validation, as that is its primary design principle. However, `convict`'s strict upfront schema definition might be even harder to reconcile with the dynamic plugin system than `config`. If `config` (from LocusLabs/lorenwest) were used, schema validation would still be a separate concern to be added, much like with the current custom system.

Therefore, the decision to implement schema validation can and perhaps should be decoupled from a major refactor of the loading mechanism itself. Adding schema validation to the *current* system is a more direct path to hardening. It would ensure that the data being fed into the existing `ConfigResolver.js` and plugin handlers is valid, which directly improves the tool's predictability and makes it more resilient to user configuration errors. This, more than the choice of loading library, would harden the repository for wider distribution by making plugin development and advanced customization less error-prone for users. While a well-known library might offer a veneer of familiarity, the custom plugin logic is where the core operational integrity lies, and schema validation directly supports that.
