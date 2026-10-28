import { z } from "zod";
import type { ToolModule } from "./types";

const HUBSPOT_SEARCH_URL = "https://api.hubspot.com/crm/v3/objects/contacts/search";

const CONTACT_PROPERTIES = ["firstname", "lastname", "email", "phone", "mobilephone", "company"];

export const hubspotTools: ToolModule = {
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
						url: `https://app.hubspot.com/contacts/${env.HUBSPOT_PORTAL_ID}/record/0-1/${c.id}`,
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
		// Add inside the register(server, { env }) block in src/tools/Hubspot_getContact.ts,
// after the existing hubspot_get_contact_by_phone tool.

server.tool(
	"hubspot_create_call",
	{
		contactId: z.string().describe("HubSpot contact ID to associate the call with"),
		title: z.string().describe("Call title, e.g. 'Follow-up call'"),
		notes: z.string().describe("Call notes or summary"),
		fromNumber: z.string().describe("Phone number the call was made from"),
	},
	async ({ contactId, title, notes, fromNumber }) => {
		// Current date and time in Sydney, as an ISO 8601 string with offset
		const sydneyTimestamp = new Intl.DateTimeFormat("sv-SE", {
			timeZone: "Australia/Sydney",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		})
			.format(new Date())
			.replace(" ", "T");

		const body = {
			properties: {
				hs_timestamp: new Date().toISOString(),
				hs_call_title: title,
				hs_call_body: notes,
				hs_call_from_number: fromNumber,
				hubspot_owner_id: "372074272",
				hs_call_status: "COMPLETED",
			},
			associations: [
				{
					to: { id: Number(contactId) },
					types: [
						{
							associationCategory: "HUBSPOT_DEFINED",
							associationTypeId: 194,
						},
					],
				},
			],
		};

		try {
			const res = await fetch("https://api.hubspot.com/crm/v3/objects/calls", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${env.HUBSPOT_ACCESS_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});

			if (!res.ok) {
				return {
					content: [{ type: "text", text: `Error: HubSpot request failed (${res.status}): ${await res.text()}` }],
					isError: true,
				};
			}

			const call = (await res.json()) as { id: string };
			return {
				content: [{ type: "text", text: JSON.stringify({ id: call.id, status: "created" }, null, 2) }],
			};
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
