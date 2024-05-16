<h1 align="center">
    <a href="https://github.com/Chartreuse-Gaming/Website">
        <img src="public/favicon.svg" alt="Logo" width="80" height="80">
    </a>
</h1>
<div align="center">
    <h3 align="center">RaceCast</h3>

![Website version](https://img.shields.io/github/package-json/v/Minarox/RaceCast/main?style=flat&label=Version)&nbsp;
![Project license](https://img.shields.io/github/license/Minarox/RaceCast?style=flat&label=License)&nbsp;
![Code size](https://img.shields.io/github/languages/code-size/Minarox/RaceCast?style=flat&label=Code%20size)&nbsp;
![Website status](https://img.shields.io/website?url=https%3A%2F%2Frallye.minarox.fr&style=flat&label=Website)

  <p align="center">
    Interface Web du projet RaceCast de diffusion en direct de données depuis une voiture de rallye.
    <br />
    <a href="https://rallye.minarox.fr/"><strong>rallye.minarox.fr »</strong></a>
  </p>
</div>
<br />

<details>
  <summary>Table of Contents</summary>

- [About](#about)
    - [Built With](#built-with)
- [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Support](#support)
- [Author](#author)
</details>

## About

Le projet RaceCast est un ensemble de solutions matérielles et logicielles permettant de diffuser en direct une multitude de données utiles pour les spectateurs suivant le déroulement de la course.
<br>
Ce dépot contient l'interface Web qui s'occupe de réceptionner et afficher les données émises depuis la voiture, comme le flux audio / vidéo de la caméra embarquée et les données de télémétrie et GPS.

<img src="docs/images/screenshot.png" title="Home Page" width="100%">

### Build With

- [Astro](https://astro.build/)
- [LiveKit](https://livekit.io/)
- [Highcharts](https://www.highcharts.com/)

## Getting Started

### Prerequisites

- NodeJS 20.x or higher
- npm 7.x or higher

### Installation

1. Clone the project
```bash
  git clone https://github.com/Minarox/RaceCast
  cd RaceCast
```

2. Install dependencies
```bash
  npm install
```

3. Create `.env` file at the root of the project with these variables:
```dotenv
PUBLIC_LIVEKIT_WS_URL="wss://example.com"
LIVEKIT_KEY="key"
LIVEKIT_SECRET="secret"
LIVEKIT_ROOM="room"
```

4. Start the server
```bash
  npm run dev
```

The server should start on [localhost:4123](http://localhost:8080/).

### Deployment

Le projet est configuré pour être déployé automatiquement sur Cloudflare Pages. <br />
Pour compiler localement le projet, exécutez la commande suivante :
```bash
  npm run build
```

A new `dist` folder will appear containing the entire compiled website.

## Author

[@Minarox](https://www.github.com/Minarox)
