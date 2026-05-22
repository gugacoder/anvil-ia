// Type declarations for federated remote modules.
// These modules are loaded at runtime via @originjs/vite-plugin-federation.

declare module "chat/App" {
  import type { ComponentType } from "react";
  const App: ComponentType;
  export default App;
}

declare module "notas/App" {
  import type { ComponentType } from "react";
  const App: ComponentType;
  export default App;
}
