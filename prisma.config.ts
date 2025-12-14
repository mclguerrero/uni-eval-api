import 'dotenv/config';
import { defineConfig } from "prisma/config";

// Config vacía: cada schema usa su propio datasource definido internamente.
export default defineConfig({});
