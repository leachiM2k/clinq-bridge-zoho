import { Contact, ContactTemplate, ContactUpdate } from '@clinq/bridge';
import querystring from 'querystring';
import { authorizeApiKey } from './access-token';
import { convertContactToZohoContact, convertZohoContactToContact } from './contact';
import { IZohoAuthResponse, IZohoContactsResponse, RequestMethods } from './interfaces';
import { isZohoContactResponse, isZohoUpdateResponse, makeRequest } from './make-request';
import parseEnvironment from './parse-environment';

export async function upsertZohoContact(
    apiKey: string,
    apiUrl: string,
    contact: ContactUpdate | ContactTemplate
): Promise<Contact> {
    const { accessToken, apiDomain } = await authorizeApiKey(apiKey, apiUrl);
    const id = (contact as ContactUpdate).id;
    const zohoContact = convertContactToZohoContact(contact, id);

    const reqOptions = {
        url: `${apiDomain}/crm/v2/Contacts`,
        method: id ? RequestMethods.PUT : RequestMethods.POST,
        body: { data: [zohoContact] }
    };
    const response = await makeRequest(reqOptions, accessToken);

    if (!response || !isZohoUpdateResponse(response) || response.data.length !== 1) {
        throw new Error("Received unexpected response from Zoho");
    }

    const [updateEntry] = response.data;
    if (updateEntry.code !== 'SUCCESS') {
        throw new Error(`Could not upsert Zoho contact: ${updateEntry.message}`);
    }

    const reqGetOptions = {
        url: `${apiDomain}/crm/v2/Contacts/${updateEntry.details.id}`,
        method: RequestMethods.GET,
    };
    const responseGet = await makeRequest(reqGetOptions, accessToken);

    const receivedContact = convertZohoContactToContact((responseGet as IZohoContactsResponse).data[ 0 ]);
    if (!receivedContact) {
        throw new Error("Could not parse received contact");
    }
    return receivedContact;
}

export async function getZohoContacts(
    apiKey: string,
    apiUrl: string,
    page: number = 1,
    previousContacts?: Contact[]
): Promise<Contact[]> {
    const { accessToken, apiDomain } = await authorizeApiKey(apiKey, apiUrl);
    const reqOptions = { url: `${apiDomain}/crm/v2/Contacts`, method: RequestMethods.GET, qs: { page } };
    const response = await makeRequest(reqOptions, accessToken);

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
        return getZohoContacts(apiKey, apiUrl, page + 1, contacts);
    }

    return contacts;
}

export async function deleteZohoContact(apiKey: string, apiUrl: string, id: string): Promise<void> {
    const { accessToken, apiDomain } = await authorizeApiKey(apiKey, apiUrl);
    const reqDeleteOptions = {
        url: `${apiDomain}/crm/v2/Contacts/${id}`,
        method: RequestMethods.DELETE,
    };
    const response = await makeRequest(reqDeleteOptions, accessToken);

    if (!response || !isZohoUpdateResponse(response) || response.data.length !== 1) {
        throw new Error("Received unexpected response from Zoho");
    }

    const [updateEntry] = response.data;
    if (updateEntry.code !== 'SUCCESS') {
        throw new Error(`Could not delete Zoho contact: ${updateEntry.code} / ${updateEntry.message}`);
    }
}

export function getTokens(code: string, accountServer: string): Promise<IZohoAuthResponse> {
    const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REDIRECT_URL } = parseEnvironment();
    const reqOptions = {
        url: `${accountServer}/oauth/v2/token`,
        method: RequestMethods.POST,
        qs: {
            code,
            redirect_uri: ZOHO_REDIRECT_URL,
            client_id: ZOHO_CLIENT_ID,
            client_secret: ZOHO_CLIENT_SECRET,
            grant_type: 'authorization_code'
        }
    };
    return makeRequest(reqOptions) as Promise<IZohoAuthResponse>;
}

export function getOAuth2RedirectUrl(): string {
    const { ZOHO_CLIENT_ID, ZOHO_REDIRECT_URL } = parseEnvironment();
    return 'https://accounts.zoho.eu/oauth/v2/auth?' + querystring.encode({
            scope: 'ZohoCRM.modules.contacts.ALL',
            client_id: ZOHO_CLIENT_ID,
            response_type: 'code',
            access_type: 'offline',
            redirect_uri: ZOHO_REDIRECT_URL
        }
    );
}
