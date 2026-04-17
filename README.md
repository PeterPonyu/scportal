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

## Deployment

This project uses GitHub Actions for automatic deployment to GitHub Pages. The workflow is triggered on push to the `main` branch.

Configuration: [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

## Project Structure

```
scportal/
├── components/          # Vue components
│   ├── AppHeader.vue
│   ├── AppFooter.vue
│   ├── HeroSection.vue
│   └── FeatureCard.vue
├── layouts/
│   └── default.vue
├── pages/
│   ├── index.vue        # Home
│   ├── datasets.vue     # Dataset browser
│   ├── explorer.vue     # Continuity explorer
│   ├── benchmarks.vue   # Benchmarking results
│   ├── models.vue       # Model catalog
│   └── about.vue        # Project information
├── public/
│   └── favicon.svg
├── nuxt.config.ts
├── tailwind.config.ts
└── package.json
```

## Technology

- Nuxt 3
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
