export interface IZohoAuthResponse {
  access_token: string;
  refresh_token: string;
  api_domain: string;
  token_type: string;
  expires_in: number;
}

export interface IZohoContact {
  id?: string; // Unique ID of the Contact
  Owner?: {
    // Name and ID of the owner of the Account
    name: string;
    id: string;
  };
  Email?: string; // Email ID of the contact
  $currency_symbol?: string; // The currency in which the revenue is generated
  Other_Phone?: string; // The other phone number of the contact, if any
  Mailing_State?: string; // Primary mailing address of the contact
  Other_State?: string; // The other address of the contact, if any
  Other_Country?: string;
  Last_Activity_Time?: string; // The date and time at which the record was last used in an operation. This is a system-generated field. You cannot modify it.
  Department?: string; // Represents the department of the contact
  $process_flow?: boolean; // Represents if the record is a blueprint data
  Assistant?: string; // Name of the contact's assistant
  Mailing_Country?: string;
  $approved?: boolean; // Represents whether the record is approved
  First_Visited_URL?: string; // The URL address of the page that the contact visited first. This is a system-generated field. You cannot modify it.
  Other_City?: string;
  Created_Time?: string; // Date and time at which the record was created. This is a system-generated field. You cannot modify it.
  $editable?: boolean; // Represents whether the record is editable
  Home_Phone?: string; // Residence phone number of the Contact
  Last_Visited_Time?: string; // The date and time at which the Contact last visited Zoho CRM. This is a system-generated field. You cannot modify it.
  Created_By?: {
    // Name and ID of the user who created the record. This is a system-generated field. You cannot modify it.
    name: string;
    id: string;
  };
  Secondary_Email?: string; // Another email address of the contact
  Description?: string; // Description of the Contact
  Vendor_Name?: string; // Name and ID of the vendor related to the Contact
  Mailing_Zip?: string;
  Twitter?: string; // The Twitter handle of the contact
  Other_Zip?: string;
  Mailing_Street?: string;
  Salutation?: string;
  First_Name?: string; // Mr., Ms, Mrs., or others
  Asst_Phone?: string; // Phone number of the Contact's assistant, if any
  Full_Name?: string; // Full name of the contact
  Record_Image?: string; // The profile image of the Contact
  Modified_By?: {
    // Name and ID of the user who modified the Account. This is a system-generated field. You cannot modify it.
    name: string;
    id: string;
  };
  Skype_ID?: string; // The Skype ID of the Contact
  Phone?: string; // The phone number of the Contact
  Account_Name?: {
    // Name and ID of the Account the Contact is associated with
    name: string;
    id: string;
  };
  Email_Opt_Out?: boolean; // Specifies whether the contact has opted out of email notifications from Zoho CRM
  Modified_Time?: string; // Date and time at which the record was last modified. This is a system-generated field. You cannot modify it.
  Date_of_Birth?: string; // Date of birth of the Contact in mm/dd/yyyy format
  Mailing_City?: string;
  Title?: string; // Title/job position of the Contact
  Other_Street?: string;
  Mobile?: string; // Mobile number of the Contact
  First_Visited_Time?: string; // Date and time at which the Contact first visited Zoho CRM. This is a system-generated field. You cannot modify it.
  Last_Name?: string; // Last name of the Contact. This is a mandatory field.
  Referrer?: string; // Name and ID of the Contact who referred this Contact
  Lead_Source?: string; // Represents the source from which the Contact was created
  Tag?: string[]; // List of tags associated with the record
  Fax?: string; // Fax number of the Contact
}

interface IZohoUpdate {
  code: string;
  status: string;
  details: any;
  message: string;
}

export interface IZohoContactsResponse {
  data: IZohoContact[];
  info: {
    per_page: number;
    count: number;
    page: number;
    more_records: boolean;
  };
}

export interface IZohoUpdateResponse {
  data: IZohoUpdate[];
}

export enum RequestMethods {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE"
}

export function isZohoContactResponse(
  response: IZohoContactsResponse | IZohoUpdateResponse | IZohoAuthResponse
): response is IZohoContactsResponse {
  const zohoContacts = response as IZohoContactsResponse;
  return (
    Array.isArray(zohoContacts.data) && zohoContacts.data[0].id !== undefined
  );
}

export function isZohoUpdateResponse(
  response: IZohoContactsResponse | IZohoUpdateResponse | IZohoAuthResponse
): response is IZohoUpdateResponse {
  const zohoError = response as IZohoUpdateResponse;
  return Array.isArray(zohoError.data) && zohoError.data[0].code !== undefined;
}
