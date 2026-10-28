import { z } from "zod";
import type { ToolModule } from "./types";

const HUBSPOT_SEARCH_URL = "https://api.hubspot.com/crm/v3/objects/contacts/search";

const CONTACT_PROPERTIES = ["firstname", "lastname", "email", "phone", "mobilephone", "company"];

export const hubspotContactTools: ToolModule = {
	register(server, { env }) {
		server.tool(
			"hubspot_get_contact_by_phone",
			{
				phone: z.string().min(7).describe("Contact phone number, e.g. +61 412 345 678 or 0412 345 678"),
			},
			async ({ phone }) => {
				// Digits only, so formatting differences (spaces, dashes, +) don't matter
				const digits = phone.replace(/\D/g, "");
				if (digits.length < 7 || digits.length > 15) {
					return {
						content: [{ type: "text", text: "Error: Please provide a valid phone number" }],
						isError: true,
					};
				}

				// Match the last 8 digits so "0412345678" and "+61412345678" both match
				const token = digits.slice(-8);

				// HubSpot filter groups are ORed together, so check both phone fields
				const body = {
					filterGroups: ["phone", "mobilephone"].map((propertyName) => ({
						filters: [{ propertyName, operator: "CONTAINS_TOKEN", value: `*${token}*` }],
					})),
					properties: CONTACT_PROPERTIES,
					limit: 5,
				};

				try {
					const res = await fetch(HUBSPOT_SEARCH_URL, {
						method: "POST",
						headers: {
							Authorization: `Bearer ${env.HUBSPOT_ACCESS_TOKEN}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify(body),
					});

					if (!res.ok) {
						return {
							content: [{ type: "text", text: `Error: HubSpot request failed (${res.status})` }],
							isError: true,
						};
					}

					const data = (await res.json()) as {
						results: { id: string; properties: Record<string, string | null> }[];
					};

					if (data.results.length === 0) {
						return { content: [{ type: "text", text: "No HubSpot contact found for that phone number." }] };
					}

					// Return only the fields the caller needs
					const contacts = data.results.map((c) => ({
						id: c.id,
						name: [c.properties.firstname, c.properties.lastname].filter(Boolean).join(" "),
						email: c.properties.email,
						company: c.properties.company,
					}));

					return { content: [{ type: "text", text: JSON.stringify(contacts, null, 2) }] };
				} catch (err) {
					return {
						content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
						isError: true,
					};
				}
			},
		);
	},
};
