# jadlospis

![React](https://img.shields.io/badge/-React-blue?logo=react&logoColor=white) ![License](https://img.shields.io/badge/license-ISC-green)

## 📝 Description

Tired of meal planning? Jadlospis is here to revolutionize your diet! This web application, built with the robust combination of Express.js and React, effortlessly generates meal plans tailored to your needs. Say goodbye to the daily 'what's for dinner?' dilemma and hello to a world of culinary convenience with Jadlospis.

## ✨ Features

- 🕸️ Web


## 🛠️ Tech Stack

- 🚀 Express.js
- ⚛️ React


## 📦 Key Dependencies

```
@emotion/react: ^11.14.0
@emotion/styled: ^11.14.1
@mui/icons-material: ^7.3.2
@mui/material: ^7.3.2
axios: ^1.12.2
dotenv: ^17.2.2
express: ^5.1.0
html2canvas: ^1.4.1
multer: ^2.0.2
react: ^19.1.1
react-dom: ^19.1.1
sass: ^1.94.0
sweetalert2: ^11.23.0
```

## 🚀 Run Commands

- **dev**: `npm run dev`
- **build**: `npm run build`
- **preview**: `npm run preview`
- **refresh**: `npm run refresh`
- **deploy**: `npm run deploy`


## 📁 Project Structure

```
.
├── eslint.config.js
├── index.html
├── package.json
├── server
│   ├── index.js
│   ├── middleware
│   │   └── auth.js
│   ├── migrateUsers.js
│   ├── models
│   │   ├── Dish.js
│   │   ├── PublicDish.js
│   │   ├── PublicMenu.js
│   │   └── User.js
│   ├── package.json
│   └── uploads
│       ├── 1760387956142-uluu4j.jpg
│       ├── 1760388042099-m3alvg.png
│       ├── 1760388269098-o2gd3w.jpg
│       ├── 1760388280208-evhwfc.png
│       ├── 1760388334815-57srie.png
│       ├── 1760388842637-kngs2z.jpg
│       ├── 1760388988391-jxzny2.jfif
│       ├── 1760389233815-8h513e.png
│       ├── 1760389536913-7igc2q.png
│       ├── 1760389625027-uc6a1a.png
│       ├── 1760389869303-ed48kx.png
│       ├── 1760390077455-r3wdah.png
│       ├── 1760390641370-mq79ol.jfif
│       ├── 1760390744411-n849qu.png
│       ├── 1760390795718-j3pjf6.jpg
│       ├── 1760637676968-gv2hf0.png
│       ├── 1760638255460-36lxmf.jpg
│       ├── 1760639993649-dhlp6c.jfif
│       ├── 1760640007576-echli8.png
│       ├── 1760640128659-yoosxz.jfif
│       ├── 1760644365060-te1p3y.png
│       ├── 1760689169304-7shlns.png
│       ├── 1760697335658-ud77c6.jfif
│       ├── 1760697378492-zp26bx.jpg
│       ├── 1760697649745-0xrhib.jpg
│       ├── 1760697721019-12izpq.png
│       ├── 1760697879750-s17wcy.jpg
│       ├── 1760697940417-4twve2.png
│       ├── 1760697977803-c6w630.jpg
│       ├── 1760698501876-pvffuj.png
│       ├── 1760698573322-ea6crt.jfif
│       ├── 1760698662170-sy8mhu.jfif
│       ├── 1760699169850-jkp9xh.jfif
│       ├── 1760700498871-io9ypr.jfif
│       ├── 1760700875556-5ej5av.jfif
│       ├── 1760807846208-1dgs67.jpg
│       ├── 1760809655805-8uc6o6.jfif
│       └── 1762536614881-e9kikp.jfif
├── src
│   ├── App.jsx
│   ├── assets
│   │   ├── favicon.ico
│   │   └── logo.png
│   ├── components
│   │   ├── ListDishesConfig.jsx
│   │   ├── dodajPotrawe.jsx
│   │   ├── jadlospis
│   │   │   ├── desktop.jsx
│   │   │   ├── jadlospis.jsx
│   │   │   └── mobile.jsx
│   │   ├── jadlospisy.jsx
│   │   ├── listaZakupow.jsx
│   │   ├── listy.jsx
│   │   ├── logowanie.jsx
│   │   ├── navbar.jsx
│   │   ├── potrawy.jsx
│   │   ├── publicJadlospisy.jsx
│   │   ├── publicPotrawy.jsx
│   │   ├── ustawienia.jsx
│   │   └── ustawieniaKonta.jsx
│   ├── js
│   │   ├── generateMenu.js
│   │   ├── potrawy.js
│   │   └── settings.js
│   ├── main.jsx
│   ├── styles
│   │   ├── _mixins.scss
│   │   ├── _vars.scss
│   │   ├── base.scss
│   │   └── components
│   │       ├── checkbox.scss
│   │       ├── config.scss
│   │       ├── primary.scss
│   │       └── table.scss
│   └── utils
│       ├── colors.js
│       ├── days.js
│       ├── limits.js
│       ├── safeParse.js
│       ├── storageHelpers.js
│       ├── stripQuotes.js
│       └── userSync.js
└── vite.config.js
```

## 🛠️ Development Setup

### Node.js/JavaScript Setup
1. Install Node.js (v18+ recommended)
2. Install dependencies: `npm install` or `yarn install`
3. Start development server: (Check scripts in `package.json`, e.g., `npm run dev`)


## 👥 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/Jan-Maciej-Bukowski/jadlospis.git`
3. **Create** a new branch: `git checkout -b feature/your-feature`
4. **Commit** your changes: `git commit -am 'Add some feature'`
5. **Push** to your branch: `git push origin feature/your-feature`
6. **Open** a pull request

Please ensure your code follows the project's style guidelines and includes tests where applicable.

## 📜 License

This project is licensed under the ISC License.

---
*This README was generated with ❤️ by ReadmeBuddy*
