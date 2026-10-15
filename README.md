# NFC Card Studio

**NFC Card Studio** is a production-grade web application built with **Next.js App Router**, **TypeScript**, **Prisma ORM**, and **PostgreSQL** for personalizing pre-designed commercial NFC business card PDFs without rasterizing or degrading the original vector artwork and backgrounds.

---

## 1. Quality Preservation & Architectural Guarantees

Traditional PDF personalization tools convert master PDFs into raster images (JPEG/PNG) or screenshot canvases before saving, resulting in fuzzy text, washed-out vector borders, loss of sharp printer lines, and bloated file sizes.

**NFC Card Studio guarantees:**
- **Zero Rasterization**: Master PDFs are loaded and modified strictly via low-level PDF object trees (`pdf-lib`). Original vector paths, gradients, CMYK metadata, and embedded printer assets are preserved untouched.
- **Physical Point Precision**: Placement coordinates are calculated in PDF points ($1\text{ pt} = 1/72\text{ in} = 0.352778\text{ mm}$), taking into account bottom-left PDF coordinate origins vs. top-left browser viewports.
- **Vector Typography**: Customer Names and Designations are drawn as true vector text directly referencing embedded standard and TrueType fonts.
- **High-Density Crisp QR Codes**: QR codes are embedded as high-density (minimum 1024x1024) PNG matrices with a standard quiet zone, ensuring reliable mobile NFC scanning even on micro physical sizes.
- **Master Immutability**: Master supplier PDFs are read-only and never overwritten during personalization. SHA-256 byte hashes are verified pre- and post-overlay.
- **Immutable Configuration Snapshots**: Every generated card retains an immutable JSON snapshot of the template geometry, element positions, and customer values at time of generation.

---

## 2. Technology Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS
- **ORM & Database**: Prisma 6 with PostgreSQL
- **PDF Manipulation & Overlay**: `pdf-lib` & `@pdf-lib/fontkit`
- **PDF Rendering & Canvas Inspector**: `pdfjs-dist`
- **QR Code Engine**: `qrcode` (PNG matrix generator) & `jsqr` (automated decodability validation)
- **Packaging**: `jszip` (commercial print ZIP bundles)
- **Security**: `bcryptjs` password hashing, HMAC SHA-256 signed sessions, private filesystem storage with magic byte validation

---

## 3. Coordinate System & Math

| Coordinate System | Origin $(0, 0)$ | Horizontal Axis ($X$) | Vertical Axis ($Y$) | Unit |
| :--- | :--- | :--- | :--- | :--- |
| **Screen / Visual Editor** | Top-Left | Increases to the Right ($+$) | Increases Downward ($+$) | PDF Points ($pt$) / Screen Pixels ($px$) |
| **PDF Page Box (`pdf-lib`)** | Bottom-Left | Increases to the Right ($+$) | Increases Upward ($+$) | PDF Points ($pt$) |

### Conversion Formula:
$$\text{pdfX} = \text{editorX}$$
$$\text{pdfY} = \text{pageHeight} - (\text{editorY} + \text{elementHeight})$$

---

## 4. Setup & Running Locally

### 1. Prerequisites
- **Node.js**: v20 or v22+
- **PostgreSQL**: Running locally or on a remote server

### 2. Configure Environment Variables
Create `.env` (or copy from `.env.example`):
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nfc_card_studio?schema=public"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="AdminSecurePassword123!"
AUTH_SECRET="nfc-studio-super-secure-secret-key-32-chars-min-12345"
STORAGE_DIR="./storage"
MAX_UPLOAD_SIZE_MB=25
```

### 3. Sync Database Schema & Seed
```powershell
# Push schema to PostgreSQL
npx prisma db push

# Seed admin user, vector sample master PDFs, template, and initial demo order
npm run seed
```

### 4. Run Automated Test Suite
```powershell
npm test
```
The test suite validates:
1. Physical coordinate conversions, aspect ratios, and boundary overflows.
2. PDF overlay engine, zero-mutation SHA-256 immutability, and dimensions match.
3. Automated QR code decoding from generated outputs using `jsQR`.
4. Storage security: PDF magic bytes validation (`%PDF-`) and strict path traversal protection.

### 5. Launch Development Server
```powershell
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

**Default Admin Credentials:**
- Email: `admin@example.com`
- Password: `AdminSecurePassword123!`

---

## 5. Application Pages & Workflow

1. **Dashboard (`/`)**: High-level metrics (templates, customers, orders, generated cards), quick action shortcuts, recent output log.
2. **Card Templates (`/templates`)**: View master card templates, physical dimensions in points and millimeters, and edit configurations.
3. **Create Template (`/templates/create`)**: Upload blank Front and Back PDFs supplied by the printer, inspect page geometry and warnings, and configure safe margins.
4. **Position Editor (`/templates/[id]/editor`)**: Visual interactive canvas with PDF.js background rendering, drag-and-drop bounding boxes, numeric point inputs, font selectors, bleed/safe guides, and undo/redo history.
5. **Customer Directory (`/customers`)**: Manage client information, job titles, and target portfolio URLs.
6. **Create Personalized Card (`/cards/create`)**: Personalization form featuring live QR preview, automated QR decoding verification, side-by-side preview, and instant export.
7. **Generated PDFs History (`/cards`)**: View personalized cards, inspect immutable versioned snapshots, download Front, Back, Combined 2-page PDF, or complete print ZIP archive with manifest.
8. **Orders & Fulfillment (`/orders`)**: Manage order references, printing batch notes, and fulfillment statuses (`PENDING`, `PROCESSING`, `COMPLETED`, `CANCELLED`).
9. **Settings & Diagnostics (`/settings`)**: View storage paths, upload limits, and run real-time automated quality diagnostic suites.
