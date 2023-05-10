import { defineConfig } from "tsup";
import pkg from "./package.json";


export default defineConfig(({ watch }) => ({
    entry: ["src/index.ts"],
    dts: !watch,
    onSuccess: watch ? "pnpm run start" : undefined,
    minify: !watch,
    format: watch ? ["cjs"] : ["cjs", "esm"],
    sourcemap: true,
    clean: true,
    external: Object.keys(pkg.dependencies),
}));