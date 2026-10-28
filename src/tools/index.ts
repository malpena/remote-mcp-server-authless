import { calculatorTools } from "./calculator";
import { customerTools } from "./SF_getCustomer";
import { hubspotContactTools } from "./Hubspot_getContact";
import type { ToolModule } from "./types";

// Adding a new tool file only requires one line here
export const allTools: ToolModule[] = [calculatorTools, customerTools];
