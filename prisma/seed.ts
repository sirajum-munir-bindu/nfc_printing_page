import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import { savePdfFile } from "../lib/storage";
import { createSampleCardPdfs } from "../lib/pdf/sample-generator";
import { personalizeCard } from "../lib/pdf/overlay";

async function main() {
  console.log("Seeding database...");

  // 1. Seed Admin
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "AdminSecurePassword123!";

  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);
    admin = await prisma.user.create({
      data: {
        name: "Studio Administrator",
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`Created admin user: ${adminEmail}`);
  }

  // 2. Check if templates exist
  const existingTemplate = await prisma.cardTemplate.findFirst();
  if (!existingTemplate) {
    console.log("Generating sample master PDFs...");
    const samplePdfs = await createSampleCardPdfs();

    const frontFile = await savePdfFile(samplePdfs.frontPdfBuffer, "master", "front_sample");
    const backFile = await savePdfFile(samplePdfs.backPdfBuffer, "master", "back_sample");

    const template = await prisma.cardTemplate.create({
      data: {
        name: "Executive NFC Business Card",
        description: "Standard US 3.5 x 2.0 inch modern vector card with Front personalization and Back QR code",
        frontPdfStorageKey: frontFile.key,
        backPdfStorageKey: backFile.key,
        frontPageIndex: 0,
        backPageIndex: 0,
        frontPageWidth: samplePdfs.width,
        frontPageHeight: samplePdfs.height,
        backPageWidth: samplePdfs.width,
        backPageHeight: samplePdfs.height,
        configuration: {
          bleedMm: 3.175,
          safeMarginMm: 3.175,
          colorProfile: "sRGB",
        },
        elements: {
          create: [
            {
              type: "NAME",
              side: "FRONT",
              x: 20,
              y: 52,
              width: 170,
              height: 22,
              fontFamily: "Helvetica-Bold",
              fontSize: 16,
              color: "#0f172a",
              alignment: "left",
              enabled: true,
            },
            {
              type: "DESIGNATION",
              side: "FRONT",
              x: 20,
              y: 78,
              width: 170,
              height: 16,
              fontFamily: "Helvetica",
              fontSize: 10,
              color: "#3b82f6",
              alignment: "left",
              enabled: true,
            },
            {
              type: "QR_CODE",
              side: "BACK",
              x: 168,
              y: 40,
              width: 68,
              height: 68,
              alignment: "center",
              enabled: true,
            },
          ],
        },
      },
      include: { elements: true },
    });

    console.log(`Created template: ${template.name} with ${template.elements.length} elements`);

    // 3. Seed Sample Customer
    const customer = await prisma.customer.create({
      data: {
        name: "Alexander Wright",
        designation: "Chief Technology Officer",
        portfolioUrl: "https://alexanderwright.dev",
        email: "alex@example.com",
      },
    });
    console.log(`Created sample customer: ${customer.name}`);

    // 4. Personalize and create first GeneratedCard record with snapshot
    const overlayResult = await personalizeCard({
      frontPdfBuffer: samplePdfs.frontPdfBuffer,
      backPdfBuffer: samplePdfs.backPdfBuffer,
      elements: template.elements.map((el) => ({
        type: el.type,
        side: el.side,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        fontFamily: el.fontFamily,
        fontSize: el.fontSize,
        color: el.color,
        alignment: el.alignment as "left" | "center" | "right",
        enabled: el.enabled,
      })),
      customer: {
        name: customer.name,
        designation: customer.designation,
        portfolioUrl: customer.portfolioUrl,
        email: customer.email,
      },
    });

    const genFront = await savePdfFile(overlayResult.frontPdfBuffer, "generated", "card_front");
    const genBack = await savePdfFile(overlayResult.backPdfBuffer, "generated", "card_back");
    const genComb = await savePdfFile(overlayResult.combinedPdfBuffer, "generated", "card_combined");

    const order = await prisma.cardOrder.create({
      data: {
        customerId: customer.id,
        templateId: template.id,
        status: "COMPLETED",
        orderReference: "ORD-2026-001",
        notes: "Initial launch demo order",
        generatedCards: {
          create: {
            frontPdfStorageKey: genFront.key,
            backPdfStorageKey: genBack.key,
            combinedPdfStorageKey: genComb.key,
            configurationSnapshot: {
              templateName: template.name,
              templateId: template.id,
              elements: template.elements,
              customer: {
                name: customer.name,
                designation: customer.designation,
                portfolioUrl: customer.portfolioUrl,
                email: customer.email,
              },
              generatedAt: new Date().toISOString(),
            },
          },
        },
      },
    });

    console.log(`Created order ${order.orderReference} and generated personalized cards`);
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
