# Test Credentials

## Application Access
No authentication required (auth is Phase 2 per master prompt).

## Supabase
- URL: https://wopyvmtylpteenfjxpgy.supabase.co
- Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcHl2bXR5bHB0ZWVuZmp4cGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzgyNjYsImV4cCI6MjA5MDU1NDI2Nn0.rAVSggTHTnFQst7N4VDPA_r14U2E32IFGxswfVjxVfQ

## Test Client (in Supabase)
- Name: Acme Packaging Ltd.
- Email: acme@example.com
- Phone: +91 98765 43210

## Test Flow
1. Load app URL
2. Client Selection Modal appears
3. Click "Acme Packaging Ltd." → Load Latest (or New Quote)
4. Fill sections 1-9 with test values
5. Grand total calculates in sticky bar
6. Export PDF/CSV, Save Snapshot

## Sample Test Values
- Master Sheet: 700 x 500mm, GSM: 300
- Flat Size: 200 x 150mm
- Order Qty: 5000
- Paper Rate: ₹120/kg
- Click Charge: ₹2.50/sheet
- Margin: 30%, GST: 18%
- Expected: Ups = 9, Gross Sheets ~2917
