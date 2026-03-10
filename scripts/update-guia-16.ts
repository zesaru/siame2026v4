import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const guia = await prisma.guiaValija.update({
    where: { numeroGuia: "16-2025" },
    data: { 
      filePath: "GUIAENTRADA/2025/08/20250815GUÍA DE VALIJA 16 ENTRADA_cmkc9uh.pdf"
    }
  });
  
  console.log("✅ Guía actualizada:", guia.numeroGuia, "->", guia.filePath);
}

main().catch(console.error).finally(() => prisma.$disconnect());
