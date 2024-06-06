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
    Web interface for the RaceCast project to broadcast live data from a rally car.
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
- [Author](#author)
</details>

## About

The RaceCast project is a set of hardware and software solutions enabling a multitude of useful data to be broadcast live to spectators following the race.
<br>
This repository contains the Web interface that receives and displays data transmitted from the car, such as the audio/video stream from the onboard camera, and telemetry and GPS data.

<img style="border-radius: 6px" src="public/preview.webp" title="Preview" width="100%">

### Build With

- [Astro](https://astro.build/)
- [LiveKit](https://livekit.io/)

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

PUBLIC_ACKEE_URL="https://example.com/tracker.js"
PUBLIC_ACKEE_DOMAIN="abcdef0123-a0b1-0a12-0a12-012a345b6789"
```

4. Start the server
```bash
  npm run dev
```

The development server should start on [localhost:4321](http://localhost:4321/).

### Deployment

The project is configured to be automatically deployed on Cloudflare Pages. <br />
To compile the project locally, run the following command:
```bash
  npm run build
```

A new `dist` folder will appear containing the entire compiled website.

## Author

[@Minarox](https://www.github.com/Minarox)
