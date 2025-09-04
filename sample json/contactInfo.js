{
  "title": "Registration",
  "type": "object",
  "properties": {
    "contact": {
      "type": "object",
      "title": "Contact Info",
      "properties": {
        "full_name": { "type": "string", "title": "Full Name" },
        "email": { "type": "string", "format": "email", "title": "Email" }
      },
      "required": ["full_name", "email"]
    },
    "address": {
      "type": "object",
      "title": "Address",
      "properties": {
        "country": { "type": "string", "title": "Country", "enum": ["US", "CA", "Other"] },
        "city": { "type": "string", "title": "City" }
      }
    }
  }
}