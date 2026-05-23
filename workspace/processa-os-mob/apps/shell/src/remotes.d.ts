// Type declarations for federated remote modules.
// These modules are loaded at runtime via @originjs/vite-plugin-federation.
//
// Cada remote aceita o contrato AppInstanceProps definido em apps/registry.tsx.

declare module "chat/App" {
  import type { ComponentType } from "react";
  import type { AppInstanceProps } from "./apps/registry";
  const App: ComponentType<AppInstanceProps>;
  export default App;
}

declare module "notas/App" {
  import type { ComponentType } from "react";
  import type { AppInstanceProps } from "./apps/registry";
  const App: ComponentType<AppInstanceProps>;
  export default App;
}
