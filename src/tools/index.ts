import { calculatorTools } from "./calculator";
import { hubspotTools } from "./hubspotTools";
import type { ToolModule } from "./types";

// Adding a new tool file only requires one line here
export const allTools: ToolModule[] = [calculatorTools, hubspotTools];
