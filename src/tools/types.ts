import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface ToolContext {
	env: Env;
}

export interface ToolModule {
	register(server: McpServer, ctx: ToolContext): void;
}
