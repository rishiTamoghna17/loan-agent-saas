import { generateAgentSite } from "../src/lib/site-builder";
import path from "path";
import fs from "fs";

const mockAgentData = {
  name: "Marcus Vance",
  bio: "Marcus Vance has over 15 years of mortgage lending experience. Dedicated to finding the best loan option for your family, Marcus specializes in FHA, VA, Conventional, and Refinance loans.",
  contact: {
    phone: "(555) 019-2834",
    email: "marcus.vance@leadhub.com",
    address: "742 Evergreen Terrace, Springfield, OR"
  },
  services: [
    {
      title: "First-Time Homebuyer Loans",
      description: "Low down payment options and guidance for first-time buyers looking to secure their dream home."
    },
    {
      title: "Refinancing Programs",
      description: "Reduce your monthly payments or cash out home equity with our competitive refinance programs."
    },
    {
      title: "FHA & VA Specialized Loans",
      description: "Flexible lending terms and zero down-payment options for veterans and qualified buyers."
    }
  ]
};

async function run() {
  console.log("Starting test Hugo site build...");
  try {
    const publicUrl = await generateAgentSite("test-agent-123", mockAgentData);
    console.log("Site built successfully!");
    console.log("Mock Public URL:", publicUrl);

    // Verify build files in destDir
    const destDir = path.join(process.cwd(), "public", "public-sites", "test-agent-123");
    console.log("Checking compiled files in:", destDir);
    
    if (fs.existsSync(destDir)) {
      const files = fs.readdirSync(destDir);
      console.log("Generated directories/files:", files);
      
      const indexHtmlPath = path.join(destDir, "index.html");
      if (fs.existsSync(indexHtmlPath)) {
        console.log("index.html exists and is non-empty!");
        const content = fs.readFileSync(indexHtmlPath, "utf8");
        console.log("Contains 'Marcus Vance':", content.includes("Marcus Vance"));
        console.log("Contains 'FHA & VA Specialized Loans' (escaped):", content.includes("FHA &amp; VA Specialized Loans"));
      } else {
        console.error("ERROR: index.html not found!");
      }

      const aboutHtmlPath = path.join(destDir, "about", "index.html");
      if (fs.existsSync(aboutHtmlPath)) {
        console.log("about/index.html exists!");
        const content = fs.readFileSync(aboutHtmlPath, "utf8");
        console.log("Contains 'About Me' in about/index.html:", content.includes("About Me"));
      } else {
        console.error("ERROR: about/index.html not found!");
      }

      const servicesHtmlPath = path.join(destDir, "services", "index.html");
      if (fs.existsSync(servicesHtmlPath)) {
        console.log("services/index.html exists!");
        const content = fs.readFileSync(servicesHtmlPath, "utf8");
        console.log("Contains 'First-Time Homebuyer Loans' in services/index.html:", content.includes("First-Time Homebuyer Loans"));
      } else {
        console.error("ERROR: services/index.html not found!");
      }
    } else {
      console.error("ERROR: compiled directory does not exist!");
    }
  } catch (error) {
    console.error("Test build failed:", error);
  }
}

run();
