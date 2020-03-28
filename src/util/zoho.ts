import { Contact, ContactTemplate } from '@clinq/bridge';
import querystring from 'querystring';
import request from 'request';
import { convertContactToZohoContact, convertZohoContactToContact } from './contact';
import { IRequest, IZohoAuthResponse, IZohoContactsResponse, IZohoUpdateResponse, RequestMethods } from './interfaces';
import parseEnvironment from './parse-environment';

async function authorizeApiKey(apiKey: string, apiUrl: string): Promise<{ accessToken: string, apiDomain: string }> {
    if (typeof apiKey !== "string" || !apiKey || apiKey.trim().length === 0) {
        throw new Error("Invalid API key.");
    }
    const [accessTokenOld, refreshToken] = apiKey.split(":");

    const { access_token, api_domain } = await getNewAccessToken(refreshToken, apiUrl);
    return { accessToken: access_token, apiDomain: api_domain };
}

function isZohoContactResponse(response: IZohoContactsResponse | IZohoUpdateResponse | IZohoAuthResponse): response is IZohoContactsResponse {
    const zohoContacts = (response as IZohoContactsResponse);
    return Array.isArray(zohoContacts.data) && zohoContacts.data[ 0 ].id !== undefined;
}

function isZohoUpdateResponse(response: IZohoContactsResponse | IZohoUpdateResponse | IZohoAuthResponse): response is IZohoUpdateResponse {
    const zohoError = (response as IZohoUpdateResponse);
    return Array.isArray(zohoError.data) && zohoError.data[ 0 ].code !== undefined;
}

function makeRequest(options: IRequest, token?: string): Promise<IZohoContactsResponse | IZohoUpdateResponse | IZohoAuthResponse> {
    const reqOptions = {
        ...options,
        json: true,
    };
    if(token) {
        reqOptions.headers = reqOptions.headers || {};
        reqOptions.headers.Authorization = `Zoho-oauthtoken ${token}`;
    }
    return new Promise((resolve, reject) => {
        request(reqOptions, (err, resp, body) => {
            if (err || body.error) {
                return reject(`Error in Zoho response: ${(err && err.message) || body.error}`);
            }

            resolve(body);
        });
    });
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

export async function updateZohoContact(
    apiKey: string,
    apiUrl: string,
    id: string,
    contact: ContactTemplate
): Promise<Contact> {
    const { accessToken, apiDomain } = await authorizeApiKey(apiKey, apiUrl);

    const zohoContact = convertContactToZohoContact(contact, id);

    const reqUpdateOptions = {
        url: `${apiDomain}/crm/v2/Contacts`,
        method: RequestMethods.PUT,
        body: { data: [zohoContact] }
    };
    const response = await makeRequest(reqUpdateOptions, accessToken);
    if (!response || !isZohoUpdateResponse(response) || response.data.length !== 1) {
        throw new Error("Received unexpected response from Zoho");
    }

    if (response.data[ 0 ].code !== 'SUCCESS') {
        throw new Error(`Could not update Zoho contact: ${response.data[ 0 ].message}`);
    }

    const reqGetOptions = {
        url: `${apiDomain}/crm/v2/Contacts/${id}`,
        method: RequestMethods.GET,
    };
    const responseGet = await makeRequest(reqGetOptions, accessToken);

    const receivedContact = convertZohoContactToContact((responseGet as IZohoContactsResponse).data[ 0 ]);
    if (!receivedContact) {
        throw new Error("Could not parse received contact");
    }
    return receivedContact;
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

function getNewAccessToken(refreshToken: string, accountServer: string): Promise<IZohoAuthResponse> {
    const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET } = parseEnvironment();
    const reqOptions = {
        url: `${accountServer}/oauth/v2/token`,
        method: RequestMethods.POST,
        qs: {
            refresh_token: refreshToken,
            client_id: ZOHO_CLIENT_ID,
            client_secret: ZOHO_CLIENT_SECRET,
            grant_type: 'refresh_token'
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
