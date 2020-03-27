import { Contact } from '@clinq/bridge';
import querystring from 'querystring';
import request from 'request';
import { convertZohoContactToContact } from './contact';
import { IZohoAuthResponse, IZohoContactsResponse } from './interfaces';
import parseEnvironment from './parse-environment';

export async function getZohoContacts(
    apiKey: string,
    apiUrl: string,
    page: number = 1,
    previousContacts?: Contact[]
): Promise<Contact[]> {
    if (typeof apiKey !== "string") {
        throw new Error("Invalid API key.");
    }
    const [accessTokenOld, refreshToken] = apiKey.split(":");

    const { access_token: accessToken, api_domain } = await getNewAccessToken(refreshToken, apiUrl);

    const response = await makeRequest('get', `${api_domain}/crm/v2/Contacts`, accessToken, { page });

    if (!Array.isArray(response.data)) {
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

function makeRequest(method: string, url: string, token: string, params: any): Promise<IZohoContactsResponse> {
    return new Promise((resolve, reject) => {
        request({
            method: method.toUpperCase(),
            url,
            json: true,
            headers: {
                'Authorization': `Zoho-oauthtoken ${token}`
            },
            qs: params
        }, (err, resp, body) => {
            if (err || body.error) {
                return reject(`Error in Zoho response: ${(err && err.message) || body.error}`);
            }

            resolve(body);
        });
    });
}

export function getTokens(code: string, accountServer: string): Promise<IZohoAuthResponse> {
    const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REDIRECT_URL } = parseEnvironment();
    return new Promise((resolve, reject) => {
        request.post({
            url: `${accountServer}/oauth/v2/token`,
            json: true,
            qs: {
                code,
                redirect_uri: ZOHO_REDIRECT_URL,
                client_id: ZOHO_CLIENT_ID,
                client_secret: ZOHO_CLIENT_SECRET,
                grant_type: 'authorization_code'
            }
        }, (err, resp, body) => {
            if (body && body.status === 'error') {
                err = body;
            }

            if (err || body.error) {
                return reject(`Error in Zoho response: ${(err && err.message) || body.error}`);
            }

            resolve(body);
        });
    });
}

function getNewAccessToken(refreshToken: string, accountServer: string): Promise<IZohoAuthResponse> {
    const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET } = parseEnvironment();
    return new Promise((resolve, reject) => {
        request.post({
            url: `${accountServer}/oauth/v2/token`,
            json: true,
            qs: {
                refresh_token: refreshToken,
                client_id: ZOHO_CLIENT_ID,
                client_secret: ZOHO_CLIENT_SECRET,
                grant_type: 'refresh_token'
            }
        }, (err, resp, body) => {
            if (err || body.error) {
                return reject(`Error in Zoho response: ${(err && err.message) || body.error}`);
            }

            resolve(body);
        });
    });
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
