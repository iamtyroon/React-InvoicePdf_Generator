# Invoice Generator

A simple, free invoice generator built with React. No signup, no paywalls, no BS.

## Why This Exists

Every other invoice generator online locks basic features behind a paywall. Want to download your invoice as a PDF? That'll be $9.99/month. Need to save a draft? Premium feature. Dark mode? Upgrade to Pro.

This tool does one thing well: generates professional invoices, completely free, entirely in your browser.

## Features

- ✅ **100% Free** - No paywalls, no "premium" features, no credit card required
- ✅ **No Account Needed** - Open the app, create your invoice, download it. Done.
- ✅ **Privacy First** - Everything runs in your browser. Your data never leaves your computer.
- ✅ **Professional PDFs** - Clean, customizable invoices ready to send to clients
- ✅ **Save Drafts Locally** - Browser storage lets you save and reload invoices (no server needed)
- ✅ **Dark Mode** - Easy on the eyes when working late
- ✅ **Multi-Currency** - Support for USD, EUR, GBP, KES, JPY, CAD, AUD, INR
- ✅ **Customization** - Add your logo, signature, choose accent colors, bank details

## Quick Start

### Running Locally

**Prerequisites:** Node.js installed on your machine

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/React-InvoicePdf_Generator.git
   cd React-InvoicePdf_Generator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to the local URL shown (typically `http://localhost:5173`)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory. Deploy to any static hosting service (Netlify, Vercel, GitHub Pages, etc.).

## How to Use

1. **Fill in your business details** in the "From" section
2. **Add client information** in the "Bill To" section
3. **Add invoice items** with descriptions, rates, and quantities
4. **Customize** the look with colors, upload your logo/signature
5. **Download PDF** when ready

### Drafts

Click **Save Draft** to store your invoice in browser storage. Access saved drafts from the **Drafts** dropdown. Drafts persist across sessions until you clear your browser data.

### Customization Options

- **8 Color Themes** - Choose an accent color for your invoice
- **8 Currencies** - Select from major global currencies
- **Logo & Signature** - Upload images directly from your computer
- **Bank Details** - Add payment information for clients
- **Payment Terms** - On Receipt, Net 15, Net 30, Net 60

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **TailwindCSS** - Styling
- **jsPDF + html2canvas** - PDF generation (client-side)

## Privacy & Data

All data processing happens in your browser. This app:
- **Does NOT** send your invoice data to any server
- **Does NOT** track you or collect analytics
- **Does NOT** require an account or login
- **Uses LocalStorage** for draft saving (stored only on your device)

## Contributing

Found a bug? Have a feature idea? PRs welcome!

## License

MIT License - Use it, fork it, make it your own.

---

**Built for freelancers, small businesses, and anyone tired of paying $10/month just to download an invoice.**
