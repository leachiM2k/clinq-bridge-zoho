import { Contact, ContactTemplate, ContactUpdate } from "@clinq/bridge";
import axios from "axios";
import querystring from "querystring";
import { authorizeApiKey } from "./access-token";
import {
  convertContactToZohoContact,
  convertZohoContactToContact
} from "./contact";
import {
  isZohoContactResponse,
  isZohoUpdateResponse,
  IZohoAuthResponse,
  IZohoContactsResponse,
  IZohoUpdateResponse,
  RequestMethods
} from "./interfaces";
import parseEnvironment from "./parse-environment";

const ZOHO_OAUTH_TOKEN_NAME = "Zoho-oauthtoken";

export async function upsertZohoContact(
  apiKey: string,
  apiUrl: string,
  contact: ContactUpdate | ContactTemplate
): Promise<Contact> {
  const { accessToken, apiDomain } = await authorizeApiKey(apiKey, apiUrl);
  const id = (contact as ContactUpdate).id;
  const zohoContact = convertContactToZohoContact(contact, id);

  const responseRequest = await axios.request<IZohoContactsResponse>({
    url: `${apiDomain}/crm/v2/Contacts`,
    method: id ? RequestMethods.PUT : RequestMethods.POST,
    data: { data: [zohoContact] },
    headers: { Authorization: `${ZOHO_OAUTH_TOKEN_NAME} ${accessToken}` }
  });

  if (!responseRequest || responseRequest.status >= 300) {
    return Promise.reject(
      `Error in Zoho response: ${responseRequest.statusText}`
    );
  }

  const response = responseRequest.data;

  if (
    !response ||
    !isZohoUpdateResponse(response) ||
    response.data.length !== 1
  ) {
    throw new Error("Received unexpected response from Zoho");
  }

  const [updateEntry] = response.data;
  if (updateEntry.code !== "SUCCESS") {
    throw new Error(`Could not upsert Zoho contact: ${updateEntry.message}`);
  }

  const responseGet = await axios.get<IZohoContactsResponse>(
    `${apiDomain}/crm/v2/Contacts/${updateEntry.details.id}`,
    { headers: { Authorization: `${ZOHO_OAUTH_TOKEN_NAME} ${accessToken}` } }
  );

  if (!responseGet || responseGet.status !== 200) {
    return Promise.reject(`Error in Zoho response: ${responseGet.statusText}`);
  }

  const receivedContact = convertZohoContactToContact(
    (responseGet.data as IZohoContactsResponse).data[0]
  );
  if (!receivedContact) {
    throw new Error("Could not parse received contact");
  }
  return receivedContact;
}

export async function getZohoContacts(
  apiKey: string,
  apiUrl: string
): Promise<Contact[]> {
  const { accessToken, apiDomain } = await authorizeApiKey(apiKey, apiUrl);
  return getPaginatedZohoContacts(accessToken, apiDomain);
}

async function getPaginatedZohoContacts(
  accessToken: string,
  apiDomain: string,
  page: number = 1,
  previousContacts?: Contact[]
): Promise<Contact[]> {
  const responseGet = await axios.get<IZohoContactsResponse>(
    `${apiDomain}/crm/v2/Contacts?page=${page}`,
    { headers: { Authorization: `${ZOHO_OAUTH_TOKEN_NAME} ${accessToken}` } }
  );

  if (!responseGet || responseGet.status !== 200) {
    return Promise.reject(`Error in Zoho response: ${responseGet.statusText}`);
  }

  const response = responseGet.data;

  if (!isZohoContactResponse(response)) {
    return [];
  }

  const contacts: Contact[] = previousContacts || [];

  for (const zohoContact of response.data) {
    const contact = convertZohoContactToContact(zohoContact);

    if (contact) {
      contacts.push(contact);
    }
  }

  if (response.info.more_records) {
    return getPaginatedZohoContacts(accessToken, apiDomain, page + 1, contacts);
  }

  return contacts;
}

export async function deleteZohoContact(
  apiKey: string,
  apiUrl: string,
  id: string
): Promise<void> {
  const { accessToken, apiDomain } = await authorizeApiKey(apiKey, apiUrl);

  const responseDelete = await axios.delete<IZohoUpdateResponse>(
    `${apiDomain}/crm/v2/Contacts/${id}`,
    { headers: { Authorization: `${ZOHO_OAUTH_TOKEN_NAME} ${accessToken}` } }
  );

  if (!responseDelete || responseDelete.status >= 300) {
    return Promise.reject(
      `Error in Zoho response: ${responseDelete.statusText}`
    );
  }

  const response = responseDelete.data;

  if (
    !response ||
    !isZohoUpdateResponse(response) ||
    response.data.length !== 1
  ) {
    throw new Error("Received unexpected response from Zoho");
  }

  const [updateEntry] = response.data;
  if (updateEntry.code !== "SUCCESS") {
    throw new Error(
      `Could not delete Zoho contact: ${updateEntry.code} / ${updateEntry.message}`
    );
  }
}

export async function getTokens(
  code: string,
  accountServer: string
): Promise<IZohoAuthResponse> {
  const {
    ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET,
    ZOHO_REDIRECT_URL
  } = parseEnvironment();

  const payload = {
    code,
    redirect_uri: ZOHO_REDIRECT_URL,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    grant_type: "authorization_code"
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

export function getOAuth2RedirectUrl(): string {
  const { ZOHO_CLIENT_ID, ZOHO_REDIRECT_URL } = parseEnvironment();
  return (
    "https://accounts.zoho.eu/oauth/v2/auth?" +
    querystring.encode({
      scope: "ZohoCRM.modules.contacts.ALL",
      client_id: ZOHO_CLIENT_ID,
      response_type: "code",
      access_type: "offline",
      redirect_uri: ZOHO_REDIRECT_URL
    })
  );
}
