# Pipflix
Android app for streaming and casting media.
### Features
- Stream and Download (360p to 1080p).
- Hindi audio first: Hindi audio is preferred for both playback and downloads when a stream offers it.
- Cast support: Google Cast/DLNA with custom remuxer supports embedded audio and sub track change support.
- WatchList.
- External player and Downloader support.
- Create custom plugins.
- Provider sources: add a provider source code (e.g. `Nadan_Prinda`) to load providers.
<br>

___

## Download

[![Download Apk](https://custom-icon-badges.demolab.com/badge/-Download_From_Github-black?style=for-the-badge&logo=download&logoColor=white)](https://github.com/hammad57/pipflix-app/releases/latest)

___

## Stack
<p align="left">

[![React-Native](https://custom-icon-badges.demolab.com/badge/-React_Native-287aad?style=for-the-badge&logo=react&logoColor=white)](https://reactnative.dev/)
[![TypeScript](https://custom-icon-badges.demolab.com/badge/Typescript-3078C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NativeWind](https://custom-icon-badges.demolab.com/badge/Native_Wind-0CA6E9?style=for-the-badge&logo=tailwind&logoColor=white)](https://www.nativewind.dev/)
[![React-Navigation](https://custom-icon-badges.demolab.com/badge/React_Navigation-6838d9?style=for-the-badge&logo=menu&logoColor=white)](https://reactnavigation.org/)
[![Expo-Modules](https://custom-icon-badges.demolab.com/badge/Expo_Modules-black?style=for-the-badge&logo=expo&logoColor=white)](https://docs.expo.dev/modules/overview/)
[![React-Native-Video](https://custom-icon-badges.demolab.com/badge/React_native_video-38d9c9?style=for-the-badge&logo=video&logoColor=white)](https://thewidlarzgroup.github.io/react-native-video/)
[![MMKV-Storage](https://custom-icon-badges.demolab.com/badge/MMKV_Storage-yellow?style=for-the-badge&logo=zap&logoColor=white)](https://github.com/mrousavy/react-native-mmkv)

</p>

## Build and Dev
0. Set-up React Native environment if you haven't already. [Guide](https://reactnative.dev/docs/set-up-your-environment)

1. clone
     ```bash
     git clone https://github.com/hammad57/pipflix-app.git
     ```
     ```
     cd pipflix-app
     ```
2. Install
     ```
     npm install
     ```
3. Prebuild
   ```
    npx expo prebuild -p android --clean
   ```
5. Open metro dev server
Dev
     ```
     npm run android
     ```
Build apk/aab
https://reactnative.dev/docs/signed-apk-android

---
> [!IMPORTANT]
> Pipflix does not host, store, or provide any media content. It is not affiliated with or connected to any external providers or extensions. All content accessed through the app is managed and sourced directly by the user via third-party tools or integrations. Pipflix has no control over it.
