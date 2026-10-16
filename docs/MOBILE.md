# Android and WebView builds

Ghost.js can build a web app for a native WebView. The normal build emits an ES module bundle and can split lazy imports into separate files. The mobile target emits one browser IIFE bundle and a matching `index.html` for projects wrapped by Capacitor or another WebView shell.

## Build for a WebView

```bash
ghost build --target=mobile
```

The command writes `dist/build/bundle.js` and `dist/build/index.html`. Set Capacitor's `webDir` to `dist/build`, then sync the Android project:

```json
{
  "appId": "com.example.app",
  "appName": "Example",
  "webDir": "dist/build"
}
```

```bash
npx cap sync android
npx cap run android
```

The generated project template marks Ghost's development loader with `data-ghost-runtime-loader`. The mobile build replaces that module-based loader with `<script src="./bundle.js"></script>`. For an existing app, add the same attribute to the script element that contains Ghost's development/build loader. The build stops with a clear error if that marker is missing.

The mobile target requires the project's `esbuild` dependency. A function-valued prop is already evaluated in a reactive effect; it updates when its getter reads a Ghost signal. Mutating a plain object by itself does not notify Ghost. A `children` getter re-renders its returned region when its signal dependencies change. Use `createList()` when list items need keyed DOM reuse.

Keep local asset URLs relative to the generated `index.html`, and make sure files that are not imported by the app bundle are also copied into `dist/build`. Capacitor expects its configured `webDir` to contain the final `index.html` and all files referenced by it. See the [Capacitor setup guide](https://capacitorjs.com/docs/getting-started).

## Choose a build target

| Command | Output | Use |
| --- | --- | --- |
| `ghost build` | ES module bundle with code splitting | Web builds that use `lazyNode()` or other split chunks |
| `ghost build --target=mobile` | Single IIFE bundle and `index.html` | WebViews that need a classic script entry and one JavaScript file |

Android WebView is Chromium-based. When module loading or lazy chunks fail, inspect the WebView origin and the paths to the emitted files before treating ES modules as unsupported. Android recommends loading app content with an HTTP(S) origin such as `WebViewAssetLoader`; `file://` and `data:` pages have opaque origins and can break normal same-origin resource behavior. See Android's [local content guidance](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content).

## BridgeJS project boundary

`@ghost-js/core` already uses `packages/core/src/bridge.js` for `persistSignal()` and local-storage persistence. Keep the native plugin transport and its Android/iOS runtimes in a separate `bridgejs` package or repository.

For the Android MVP, define the message format, plugin method allowlist, callback timeout and cleanup behavior, and native permission lifecycle before adding camera or storage plugins. Android currently recommends `WebMessageListener` with allowed origins; `addJavascriptInterface` is a legacy option exposed to every frame in the WebView. See the [Android JavaScript bridge guidance](https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge).
