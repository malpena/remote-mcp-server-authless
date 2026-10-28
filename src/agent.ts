import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { allTools } from "./tools";

export class MyMCP extends McpAgent {
	server = new McpServer({ name: "Business Tools", version: "1.0.0" });

	async init() {
		for (const tool of allTools) {
			tool.register(this.server, { env: this.env as Env });
		}
	}
}
