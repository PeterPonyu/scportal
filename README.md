# SCPortal Hub

> Single-Cell Portal Hub - A unified platform combining iAODE Dataset Browser and LAIOR Benchmarking Dashboard

[![Nuxt](https://img.shields.io/badge/Nuxt-3.15+-00DC82?logo=nuxt.js&logoColor=white)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.5+-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## 🌟 Overview

SCPortal Hub is a comprehensive web platform that unifies two powerful single-cell analysis resources:

- **[iAODE Dataset Browser](https://peterponyu.github.io/iAODE/)** - Browse 100+ standardized scATAC-seq and scRNA-seq datasets
- **[LAIOR Benchmarking Dashboard](https://peterponyu.github.io/liora-ui/)** - Compare 23+ state-of-the-art single-cell analysis models

## ✨ Features

### Dataset Browser
- 📊 93+ scATAC-seq studies with 434 datasets
- 🧬 20+ scRNA-seq studies with 183 datasets
- 🔍 Filter by organism, dataset size, and modality
- 📥 Standardized 10X h5 format

### Continuity Explorer
- 📈 Interactive trajectory visualization
- 🗺️ Multiple embedding methods (PCA, UMAP, t-SNE)
- 🔄 Linear, branching, cyclic, and discrete trajectories
- ⚡ Pre-computed data for fast exploration

### Benchmarking Dashboard
- 🏆 23+ state-of-the-art models compared
- 📏 50+ evaluation metrics
- 📊 Interactive charts and heatmaps
- 📖 Detailed model documentation

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/PeterPonyu/scportal-hub.git
cd scportal-hub

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to view the application.

## 📦 Build

```bash
# Build for production
npm run build

# Generate static site
npm run generate

# Preview production build
npm run preview
```

## 🛠️ Technology Stack

- **Framework**: [Nuxt 3](https://nuxt.com) - The Intuitive Vue Framework
- **UI**: [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- **Icons**: Custom SVG icons
- **Type Safety**: TypeScript
- **Deployment**: Static site generation for GitHub Pages

## 📂 Project Structure

```
scportal-hub/
├── app.vue              # Root component
├── nuxt.config.ts       # Nuxt configuration
├── tailwind.config.ts   # Tailwind CSS configuration
├── components/          # Vue components
│   ├── AppHeader.vue    # Navigation header
│   ├── AppFooter.vue    # Site footer
│   ├── HeroSection.vue  # Landing page hero
│   └── FeatureCard.vue  # Feature cards
├── layouts/             # Page layouts
│   └── default.vue      # Default layout
├── pages/               # Route pages
│   ├── index.vue        # Home page
│   ├── datasets.vue     # Dataset browser
│   ├── explorer.vue     # Continuity explorer
│   ├── benchmarks.vue   # Benchmarking dashboard
│   ├── models.vue       # Model catalog
│   └── about.vue        # About page
└── public/              # Static assets
    └── favicon.svg      # Site favicon
```

## 🔗 Related Projects

- [iAODE](https://github.com/PeterPonyu/iAODE) - Interpretable Accessibility ODE VAE for scATAC-seq
- [LAIOR](https://github.com/PeterPonyu/Liora) - Lorentz Attentive Interpretable ODE Regularized VAE
- [liora-ui](https://github.com/PeterPonyu/liora-ui) - LAIOR Benchmarking Dashboard

## 📚 Data Resources

- [NCBI GEO Database](https://www.ncbi.nlm.nih.gov/geo/) - Gene Expression Omnibus
- [10X Genomics](https://www.10xgenomics.com/) - Single-cell technology

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Zeyu Fu**
- Email: [fuzeyu99@126.com](mailto:fuzeyu99@126.com)
- GitHub: [@PeterPonyu](https://github.com/PeterPonyu)

## 🙏 Acknowledgments

Built with ❤️ for the single-cell analysis community.

- [scVI-tools](https://scvi-tools.org/) - Probabilistic analysis of single-cell omics data
- [Scanpy](https://scanpy.readthedocs.io/) - Single-Cell Analysis in Python
- [AnnData](https://anndata.readthedocs.io/) - Annotated Data

---

<p align="center">
  <a href="https://nuxt.com">
    <img src="https://nuxt.com/assets/design-kit/logo-green-black.svg" alt="Powered by Nuxt" width="150">
  </a>
</p>
