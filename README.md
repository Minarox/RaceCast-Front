<div id="top"></div>
<br />

<div align="center">
<a href="https://github.com/RaceCar/Front-End">
    <img src="https://avatars.githubusercontent.com/u/134273283?s=80" alt="Logo" width="auto" height="80" style="border-radius: 8px">
</a>

<h3 align="center">User</h3>

![Project Version](https://img.shields.io/github/package-json/v/RaceCast/User?label=Version)&nbsp;
![Project License](https://img.shields.io/github/license/RaceCast/User?label=Licence)&nbsp;
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/RaceCast/User/node.js.yml?label=Build)

  <p align="center">
    Interface for displaying race car datas and stream.
    <br />
    <a href="https://rallye.minarox.fr/"><strong>rallye.minarox.fr »</strong></a>
  </p>
</div>
<br />

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#features">Features</a></li>
        <li><a href="#tech-stack">Tech Stack</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#start-development-server">Start development server</a></li>
        <li><a href="#deploy">Deploy</a></li>
      </ul>
    </li>
    <li><a href="#author">Author</a></li>
  </ol>
</details>

## About The Project

User interface gathering the information and the video stream returned by the onboard system from the race car.

### Features

- User connection status
- System connection status with latency
- GPS location of the car
- Speed of the car
- Temperature of the car's interior
- Speed history graph
- [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

### Tech Stack

- [VueJS](https://vuejs.org/)
    - [Sass](https://sass-lang.com/)
    - [EsLint](https://eslint.org/)
    - [Prettier](https://prettier.io/)
    - [Register Service Worker](https://www.npmjs.com/package/register-service-worker)
- [OpenLayers](https://openlayers.org/)
- [Chart.js](https://www.chartjs.org/)
- [LiveKit](https://livekit.io/)

<p align="right">(<a href="#top">back to top</a>)</p>

## Getting Started

### Prerequisites

- Install [Node.js](https://nodejs.org/) with [npm](https://www.npmjs.com/)

```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
```

### Start development server

- Install dependencies

```bash
  npm install
```

- Lint and fix files

```bash
  npm run lint
```

- Start development server

```bash
  npm run dev
```

- Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

### Deploy

- Build for production

```bash
  npm run build
```

- The website is now in the `dist` folder ready to be deployed.

<p align="right">(<a href="#top">back to top</a>)</p>

## Author

[@Minarox](https://www.github.com/Minarox)

<p align="right">(<a href="#top">back to top</a>)</p>
