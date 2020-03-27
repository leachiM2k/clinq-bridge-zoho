export interface IOAuth2Options {
	ZOHO_CLIENT_ID: string;
	ZOHO_CLIENT_SECRET: string;
	ZOHO_REDIRECT_URL: string;
}

export default function parseEnvironment(): IOAuth2Options {
	const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REDIRECT_URL } = process.env;

	if (!ZOHO_CLIENT_ID) {
		throw new Error("Missing client ID in environment.");
	}

	if (!ZOHO_CLIENT_SECRET) {
		throw new Error("Missing client secret in environment.");
	}

	if (!ZOHO_REDIRECT_URL) {
		throw new Error("Missing redirect url in environment.");
	}

	return {
		ZOHO_CLIENT_ID,
		ZOHO_CLIENT_SECRET,
		ZOHO_REDIRECT_URL
	};
}
