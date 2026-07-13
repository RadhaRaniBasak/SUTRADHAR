import { groqClient } from "../src/integrations/groq/index.js";

async function testGroqAPI() {
  try {
    console.log("Testing Groq API...");
    
    if (!groqClient.isConfigured()) {
      console.error("❌ Groq API key not configured");
      return;
    }

    const response = await groqClient.chat([
      { role: "user", content: "Say hello in one sentence" }
    ]);

    console.log("✅ Groq API is working!");
    console.log("Response:", response.choices[0]?.message?.content);
  } catch (error) {
    console.error("❌ Groq API test failed:", error);
  }
}

testGroqAPI();
