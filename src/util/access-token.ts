import axios from "axios";
import querystring from "querystring";
import { IZohoAuthResponse } from "./interfaces";
import parseEnvironment from "./parse-environment";

export async function authorizeApiKey(
  apiKey: string,
  apiUrl: string
): Promise<{ accessToken: string; apiDomain: string }> {
  if (typeof apiKey !== "string" || !apiKey || apiKey.trim().length === 0) {
    throw new Error("Invalid API key.");
  }
  const [, refreshToken] = apiKey.split(":");

  if (!refreshToken) {
    throw new Error("Could not extract refresh token from api key");
  }

  const { access_token, api_domain } = await getNewAccessToken(
    refreshToken,
    apiUrl
  );
  // TODO: maybe it is worth to cache the access token? (with the refresher token as key)
  return { accessToken: access_token, apiDomain: api_domain };
}

async function getNewAccessToken(
  refreshToken: string,
  accountServer: string
): Promise<IZohoAuthResponse> {
  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET } = parseEnvironment();

  const payload = {
    refresh_token: refreshToken,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    grant_type: "refresh_token"
  };

  const response = await axios.post<IZohoAuthResponse>(
    `${accountServer}/oauth/v2/token?${querystring.encode(payload)}`,
    {}
  );

  if (!response || response.status !== 200) {
    return Promise.reject(`Error in Zoho response: ${response.statusText}`);
  }

  return response.data;
}
