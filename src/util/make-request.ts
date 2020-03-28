import request from 'request';
import { IRequest, IZohoAuthResponse, IZohoContactsResponse, IZohoUpdateResponse } from './interfaces';

const ZOHO_OAUTH_TOKEN_NAME = 'Zoho-oauthtoken';

export function makeRequest(options: IRequest, token?: string): Promise<IZohoContactsResponse | IZohoUpdateResponse | IZohoAuthResponse> {
    const reqOptions = {
        ...options,
        json: true,
    };
    if(token) {
        reqOptions.headers = reqOptions.headers || {};
        reqOptions.headers.Authorization = `${ZOHO_OAUTH_TOKEN_NAME} ${token}`;
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

export function isZohoContactResponse(response: IZohoContactsResponse | IZohoUpdateResponse | IZohoAuthResponse): response is IZohoContactsResponse {
    const zohoContacts = (response as IZohoContactsResponse);
    return Array.isArray(zohoContacts.data) && zohoContacts.data[ 0 ].id !== undefined;
}

export function isZohoUpdateResponse(response: IZohoContactsResponse | IZohoUpdateResponse | IZohoAuthResponse): response is IZohoUpdateResponse {
    const zohoError = (response as IZohoUpdateResponse);
    return Array.isArray(zohoError.data) && zohoError.data[ 0 ].code !== undefined;
}
