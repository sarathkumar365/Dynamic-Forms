{
  "title": "Sales Intake",
  "type": "object",
  "properties": {
    "account": {
      "type": "object",
      "title": "Customer Account",
      "properties": {
        "customer_type": { "type": "string", "title": "Customer Type", "enum": ["individual", "company"] },
        "company_name": { "type": "string", "title": "Company Name" },
        "contact_full_name": { "type": "string", "title": "Contact Full Name" },
        "contact_email": { "type": "string", "format": "email", "title": "Contact Email" },
        "country": { "type": "string", "title": "Country", "enum": ["US", "CA", "GB", "DE", "IN", "Other"] },
        "state": { "type": "string", "title": "State/Province" },
        "region": { "type": "string", "title": "Sales Region", "enum": ["NA", "EMEA", "APAC", "LATAM"] },
        "vat_number": { "type": "string", "title": "VAT Number" },
        "is_new_customer": { "type": "boolean", "title": "New Customer?" },
        "lead_source": {
          "type": "string",
          "title": "Lead Source",
          "enum": ["inbound", "outbound", "partner", "event", "referral", "website", "other"]
        }
      },
      "required": ["customer_type", "country", "region", "is_new_customer", "lead_source"]
    },
    "deal_details": {
      "type": "object",
      "title": "Deal Details",
      "properties": {
        "sales_rep": { "type": "string", "title": "Sales Rep" },
        "team": { "type": "string", "title": "Team", "enum": ["enterprise", "commercial", "smb"] },
        "product_line": { "type": "string", "title": "Product Line", "enum": ["core_suite", "analytics_addon", "support_plan", "services"] },
        "channel": { "type": "string", "title": "Channel", "enum": ["direct", "partner", "online"] },
        "deal_stage": { "type": "string", "title": "Deal Stage", "enum": ["qualification", "proposal", "negotiation", "closed_won", "closed_lost"] },
        "close_date": { "type": "string", "format": "date", "title": "Target Close Date" },
        "competitor": { "type": "string", "title": "Primary Competitor" },
        "loss_reason": { "type": "string", "title": "Loss Reason (if lost)" },
        "partner_name": { "type": "string", "title": "Partner Name" }
      },
      "required": ["product_line", "channel", "deal_stage"]
    },
    "pricing": {
      "type": "object",
      "title": "Pricing & Terms",
      "properties": {
        "currency": { "type": "string", "title": "Currency", "enum": ["USD", "CAD", "EUR", "GBP", "INR", "Other"] },
        "amount": { "type": "number", "title": "Deal Amount", "minimum": 0 },
        "discount_pct": { "type": "number", "title": "Discount %", "minimum": 0, "maximum": 100 },
        "probability": { "type": "integer", "title": "Probability %", "minimum": 0, "maximum": 100 },
        "expected_revenue": { "type": "number", "title": "Expected Revenue", "minimum": 0 },
        "payment_terms": { "type": "string", "title": "Payment Terms", "enum": ["prepaid", "net_15", "net_30", "net_60"] },
        "billing_cycle": { "type": "string", "title": "Billing Cycle", "enum": ["one_time", "monthly", "quarterly", "annual"] },
        "monthly_utilities": { "type": "number", "title": "Monthly Utilities (if applicable)", "minimum": 0 },
        "is_partner_deal": { "type": "boolean", "title": "Partner Sourced?" }
      },
      "required": ["currency", "amount", "payment_terms", "billing_cycle", "probability"]
    }
  },

  "oneOf": [
    {
      "title": "New Business",
      "properties": {
        "deal_details": {
          "properties": {
            "competitor": { "type": "string", "title": "Primary Competitor" }
          }
        }
      },
      "required": []
    },
    {
      "title": "Renewal",
      "properties": {
        "pricing": {
          "properties": {
            "previous_contract_value": { "type": "number", "title": "Previous Contract Value", "minimum": 0 }
          }
        }
      },
      "required": []
    }
  ],

  "allOf": [
    {
      "if": { "properties": { "account": { "properties": { "country": { "const": "US" } }, "required": ["country"] } } },
      "then": {
        "properties": {
          "account": {
            "required": ["state"],
            "properties": { "state": { "enum": ["CA", "NY", "TX", "WA", "FL"] } }
          }
        }
      }
    },
    {
      "if": { "properties": { "account": { "properties": { "region": { "const": "EMEA" } }, "required": ["region"] } } },
      "then": { "properties": { "account": { "required": ["vat_number"] } } }
    },
    {
      "if": { "properties": { "pricing": { "properties": { "is_partner_deal": { "const": true } }, "required": ["is_partner_deal"] } } },
      "then": { "properties": { "deal_details": { "required": ["partner_name"] } } }
    },
    {
      "if": { "properties": { "deal_details": { "properties": { "deal_stage": { "const": "closed_lost" } }, "required": ["deal_stage"] } } },
      "then": { "properties": { "deal_details": { "required": ["loss_reason"] } } }
    }
  ]
}
