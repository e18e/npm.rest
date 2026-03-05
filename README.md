# npm.rest

> An alternative npm registry database & API enriched with additional metadata

## What is this?

The `npm.rest` project exists to eventually provide an alternative and/or complimentary data source for the npm registry, with a focus on enriched metadata and improved querying.

Within the [e18e community](https://e18e.dev/), we have a strong interest in dependency tree analysis and supply chain security. So far, much of this has involved manual work of joining various APIs and datasets to get the information we need. This project aims to reduce that manual work by providing a more enriched npm registry database.

On top of this, other projects like [npmx](https://npmx.dev/) have similar demand for enriched npm metadata rather than having to do the expensive computation themselves.

## Current Status

We are currently in very early stages of development, focusing mostly on building the initial data structure and ingestion pipelines. The current focus is on researching which endpoints we can provide, and what kind of enriched metadata would be most useful.

## Timeline

Our current timeline looks roughly like this:

- **Phase 1**: Initial data structure and ingestion, including basic metadata enrichment
- **Phase 2**: Building out the API and querying capabilities
- **Phase 3**: Additional dependency tree analysis (e.g. engine constraints, license types)
- **Phase N**: Community feedback, additional features, and ongoing maintenance

You can track the progress of the significant parts of this here:

- Initial data structure (#2)
- Initial API design (#18)

## Get Involved

If you'd like to get involved with this project, we'd love the help! Please reach out in the [e18e Discord](https://chat.e18e.dev/) or open an issue here on GitHub.

## Sponsors

<p align="center">
  <a href="https://e18e.dev/sponsor">
    <img src="https://e18e.dev/sponsors.svg" alt="e18e community sponsors" />
  </a>
</p>

## License

MIT
