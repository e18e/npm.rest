# npm.rest

> An alternative npm registry database & API enriched with additional metadata

## What is this?

The `npm.rest` project exists to eventually provide an alternative and/or complimentary data source for the npm registry, with a focus on enriched metadata and improved querying.

Within the [e18e community](https://e18e.dev/), we have a strong interest in dependency tree analysis and supply chain security. So far, much of this has involved manual work of joining various APIs and datasets to get the information we need. This project aims to reduce that manual work by providing a more enriched npm registry database.

On top of this, other projects like [npmx](https://npmx.dev/) have similar demand for enriched npm metadata rather than having to do the expensive computation themselves.

## Current Status

We are currently in very early stages of development, focusing mostly on building the initial data structure and ingestion pipelines. The current focus is on researching which endpoints we can provide, and what kind of enriched metadata would be most useful.

## Initial Goals

We aim to provide additional metadata that is not currently available in the standard npm registry API, such as:

- License types used deeply in the dependency tree
- ESM/CJS/TypeScript usage deeply in the dependency tree
- Engine constraints used deeply in the dependency tree
- "User Downloads" (downloads from direct dependencies of user projects)
- Provenance/Trusted Publisher information

In addition to this, we want to provide advanced querying capabilities, such as:

- Finding dependents of a package
- Finding packages within a particular engine constraint range
- Finding packages with specific license types

## Get Involved

If you'd like to get involved with this project, we'd love the help! Please reach out in the [e18e Discord](https://chat.e18e.dev/) or open an issue here on GitHub.

## License

MIT
