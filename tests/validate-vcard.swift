import Contacts
import Foundation

guard CommandLine.arguments.count == 2 else {
  fputs("Usage: swift validate-vcard.swift <file.vcf>\n", stderr)
  exit(64)
}

let fileURL = URL(fileURLWithPath: CommandLine.arguments[1])
let data = try Data(contentsOf: fileURL)
let contacts = try CNContactVCardSerialization.contacts(with: data)

guard contacts.count == 1 else {
  fputs("Expected exactly one contact, found \(contacts.count)\n", stderr)
  exit(1)
}

let contact = contacts[0]
print("Parsed 1 contact: \(contact.givenName) \(contact.familyName)")
print("Phones: \(contact.phoneNumbers.count), emails: \(contact.emailAddresses.count), URLs: \(contact.urlAddresses.count)")
