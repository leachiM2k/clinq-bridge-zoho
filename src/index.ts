import {
  Adapter,
  Config,
  Contact,
  ContactTemplate,
  ContactUpdate,
  ServerError,
  start
} from "@clinq/bridge";
import dotenv from "dotenv";
import { Request } from "express";
import { anonymizeKey } from './util/anonymize-key';
import { getOAuth2RedirectUrl, getTokens, getZohoContacts } from "./util/zoho";

dotenv.config();

class ZohoAdapter implements Adapter {
  public async getContacts(config: Config): Promise<Contact[]> {
    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new ServerError(400, 'No server key provided');
    }

    const apiUrl = config.apiUrl;
    if (!apiUrl) {
      throw new ServerError(400, 'No server url provided');
    }

    try {
      return await getZohoContacts(apiKey, apiUrl);
    } catch (error) {
      // tslint:disable-next-line:no-console
      console.error(`Could not get contacts for key "${anonymizeKey(apiKey)}"`, error.message);
      throw new ServerError(401, "Unauthorized");
    }
  }

  // TODO
  public async createContact(config: Config, contact: ContactTemplate): Promise<Contact> {
    throw new Error("Not Implemented");
  };

  // TODO
  public async updateContact(config: Config, id: string, contact: ContactUpdate): Promise<Contact> {
    throw new Error("Not Implemented");
  };

  // TODO
  public async deleteContact(config: Config, id: string): Promise<void> {
    throw new Error("Not Implemented");
  };

  /**
   * REQUIRED FOR OAUTH2 FLOW
   * Return the redirect URL for the given contacts provider.
   * Users will be redirected here to authorize CLINQ.
   */
  public async getOAuth2RedirectUrl(): Promise<string> {
    return getOAuth2RedirectUrl();
  }

  /**
   * REQUIRED FOR OAUTH2 FLOW
   * Users will be redirected here after authorizing CLINQ.
   */
  public async handleOAuth2Callback(req: Request): Promise<{ apiKey: string; apiUrl: string }> {
    if (req.query.error) {
      throw new Error('Access denied to ZOHO CRM');
    }

    const { code, 'accounts-server': accountsServer } = req.query;
    const { access_token, refresh_token } = await getTokens(code, accountsServer);
    return {
      apiKey: `${access_token}:${refresh_token}`,
      apiUrl: accountsServer
    };
  }

}

start(new ZohoAdapter());
