import { bumpVersionFiles } from "./bump-version";

const { prev, next } = bumpVersionFiles();
console.log(`Version: ${prev} → ${next}`);
