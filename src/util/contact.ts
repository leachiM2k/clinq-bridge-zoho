import { Contact, ContactTemplate, ContactUpdate, PhoneNumber, PhoneNumberLabel } from "@clinq/bridge";
import { IZohoContact } from './interfaces';

export function convertZohoContactToContact(zohoContact: IZohoContact): Contact | null {
    if (!zohoContact.id) {
        return null;
    }
    return {
        id: zohoContact.id,
        name: zohoContact.Full_Name || null,
        firstName: zohoContact.First_Name || null,
        lastName: zohoContact.Last_Name || null,
        email: zohoContact.Email || null,
        organization: null,
        contactUrl: null, // TODO
        avatarUrl: null, // TODO
        phoneNumbers: collectPhoneNumbersFromZohoContact(zohoContact)
    };
}

function collectPhoneNumbersFromZohoContact(zohoContact: IZohoContact): PhoneNumber[] {
    const phoneNumbers: PhoneNumber[] = [];

    if (zohoContact.Home_Phone) {
        phoneNumbers.push({ label: PhoneNumberLabel.HOME, phoneNumber: zohoContact.Home_Phone });
    }
    if (zohoContact.Phone) {
        phoneNumbers.push({ label: PhoneNumberLabel.WORK, phoneNumber: zohoContact.Phone });
    }
    if (zohoContact.Mobile) {
        phoneNumbers.push({ label: PhoneNumberLabel.MOBILE, phoneNumber: zohoContact.Mobile });
    }
    if (zohoContact.Fax) {
        phoneNumbers.push({ label: "FAX" as PhoneNumberLabel, phoneNumber: zohoContact.Fax });
    }
    if (zohoContact.Other_Phone) {
        phoneNumbers.push({ label: "OTHER" as PhoneNumberLabel, phoneNumber: zohoContact.Other_Phone });
    }

    return phoneNumbers;
}

export function convertContactToZohoContact(contact: ContactUpdate | ContactTemplate, id?: string): IZohoContact {
    const zohoContact: IZohoContact = {
    };

    if (id) {
        zohoContact.id = id;
    }

    if (contact.firstName) {
        zohoContact.First_Name = contact.firstName;
    }
    if (contact.lastName) {
        zohoContact.Last_Name = contact.lastName;
    }

    if (contact.email) {
        zohoContact.Email = contact.email;
    }

    if (contact.organization) {
        // TODO: find appropriate field
    }

    if (Array.isArray(contact.phoneNumbers)) {
        contact.phoneNumbers.forEach((entry: PhoneNumber) => {
            if (entry.label === PhoneNumberLabel.HOME) {
                zohoContact.Home_Phone = entry.phoneNumber;
            }
            if (entry.label === PhoneNumberLabel.WORK) {
                zohoContact.Phone = entry.phoneNumber;
            }
            if (entry.label === PhoneNumberLabel.MOBILE) {
                zohoContact.Mobile = entry.phoneNumber;
            }
            if (entry.label === "FAX" as PhoneNumberLabel) {
                zohoContact.Fax = entry.phoneNumber;
            }
            if (entry.label === "OTHER" as PhoneNumberLabel) {
                zohoContact.Other_Phone = entry.phoneNumber;
            }
        });
    }

    return zohoContact;
}
