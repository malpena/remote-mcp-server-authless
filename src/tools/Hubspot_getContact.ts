import { z } from "zod";
import { SalesforceClient } from "../lib/salesforce";
import type { HubspotContactTools } from "./types";

export const customerTools: ToolModule = {
	register(server, { env }) {
		const sf = new SalesforceClient(env);

		server.tool(
			"Hubspot_lookup_customer_by_phone",
			{ phone: z.string().min(7).describe("e.g. +61 412 345 678") },
			async ({ phone }) => {
				const digits = phone.replace(/\D/g, "");
				const data = await sf.search(
					`FIND {${digits}} IN PHONE FIELDS RETURNING Contact(Id, Name), Account(Id, Name) LIMIT 5`,
				);
				const text = data.searchRecords.length
					? JSON.stringify(data.searchRecords.map((r) => ({ type: r.attributes.type, name: r.Name })), null, 2)
					: "No customer found for that phone number.";
				return { content: [{ type: "text", text }] };
			},
		);

		// Add more customer tools here, e.g. get_customer_orders, update_customer_notes
	},
};
