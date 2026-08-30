<div align="center">
  <a href="https://peterponyu.github.io/">
    <img src="https://peterponyu.github.io/assets/badges/scportal.svg" width="64" alt="ZF Lab · scportal">
  </a>
</div>

# SCPortal

A web portal that links public single-cell analysis resources from the iAODE and LAIOR projects.

## Overview

SCPortal provides a unified interface to access:

- **iAODE Dataset Browser** ([https://peterponyu.github.io/iAODE/](https://peterponyu.github.io/iAODE/)) - Curated single-cell ATAC-seq and RNA-seq datasets in standardized 10X h5 format
- **LAIOR Benchmarking Dashboard** ([https://peterponyu.github.io/liora-ui/](https://peterponyu.github.io/liora-ui/)) - Benchmarking results for single-cell VAE models
- **AutoSelect** (static route `/scportal/autoselect/`; public propagation pending) - A fail-closed model-selection surface with a traceable bridge to the 13-publication thesis line

The AutoSelect thesis bridge reports method identity, five scientific layers,
configuration-template coverage, pin-contract checks, and evidence-release
status. Its browser ranking remains on the synthetic release; the bridge is a
software-resource/reproducibility layer and does not claim a new biological
benchmark or universal leaderboard.

## External Resources

### iAODE

The iAODE project hosts:
- public scATAC-seq and scRNA-seq dataset resources
- a continuity explorer for trajectory visualization

Source: [https://github.com/PeterPonyu/iAODE](https://github.com/PeterPonyu/iAODE)

### LAIOR

The LAIOR benchmarking platform provides:
- comparative evaluation views for multiple single-cell VAE model families
- benchmark datasets covering scRNA-seq and scATAC-seq studies
- standardized evaluation summaries

Model categories include:
- Predictive models (encoder-only)
- Generative VAE models
- Trajectory inference models
- scATAC-specific models
- Gaussian geometric models
- Disentanglement models

Source: [https://github.com/PeterPonyu/liora-ui](https://github.com/PeterPonyu/liora-ui)

## Pages

| Page | Description | External Link |
|------|-------------|---------------|
| Datasets | Browse scATAC-seq and scRNA-seq datasets | [iAODE Datasets](https://peterponyu.github.io/iAODE/datasets/) |
| Explorer | Trajectory continuity visualization | [iAODE Explorer](https://peterponyu.github.io/iAODE/explorer/explorer/) |
| Benchmarks | Model evaluation results | [LAIOR Dashboard](https://peterponyu.github.io/liora-ui/) |
| Models | Model catalog with documentation | [LAIOR Models](https://peterponyu.github.io/liora-ui/models/) |

## Development

### Requirements

- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/PeterPonyu/scportal.git
cd scportal
npm install
npm run dev
```

The development server runs at `http://localhost:3000`.

### Build

```bash
# Production build
npm run build

# Static site generation
npm run generate

# Preview build
npm run preview
```

`npm run generate` first validates the router registry and builds the thesis
bridge. The bridge requires the versioned, public-safe snapshots
`data/thesis-bridge-runtime.json` and `data/thesis-bridge-chain.json`; this keeps
an independent SCPortal checkout reproducible without a sibling thesis folder.
When a thesis checkout is present, the build compares stable receipt summaries
and fails closed on drift.

## Deployment

This project uses GitHub Actions for automatic deployment to GitHub Pages. The workflow is triggered on push to the `main` branch.

Configuration: [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

## Project Structure

```
scportal/
├── app/                 # Nuxt application and router/compiler modules
├── data/                # Router registry and thesis bridge snapshots
├── scripts/             # Asset, bridge, and rendered-page gates
├── tests/               # Router, config, site, and UI contracts
├── public/
│   └── favicon.svg
├── nuxt.config.ts
├── tailwind.config.ts
└── package.json
```

## Technology

- Nuxt 4
- Vue 3
- Tailwind CSS
- TypeScript

## Related Repositories

- [iAODE](https://github.com/PeterPonyu/iAODE) - Interpretable Accessibility ODE for single-cell analysis
- [Liora](https://github.com/PeterPonyu/Liora) - LAIOR VAE implementation
- [liora-ui](https://github.com/PeterPonyu/liora-ui) - LAIOR benchmarking dashboard

## License

MIT License. See [LICENSE](LICENSE) for details.

## Author

Zeyu Fu  
Email: fuzeyu99@126.com  
GitHub: [PeterPonyu](https://github.com/PeterPonyu)
