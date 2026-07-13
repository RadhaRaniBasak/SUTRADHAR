import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function testGroqAPI() {
  console.log("🔍 Testing Groq API...");
  console.log(`API Key configured: ${GROQ_API_KEY ? "✅ Yes" : "❌ No"}`);

  if (!GROQ_API_KEY) {
    console.error("❌ ERROR: GROQ_API_KEY not found in .env file!");
    process.exit(1);
  }

  try {
    console.log("\n📤 Sending request to Groq API with llama-3.3-70b-versatile...");
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: "Say hello in one sentence"
          }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ API Error:", error);
      process.exit(1);
    }

    const data = await response.json();
    
    console.log("\n✅ SUCCESS! Groq API is responding!");
    console.log("\n📋 Response Details:");
    console.log(`   Model: ${data.model}`);
    console.log(`   Tokens used: ${data.usage.total_tokens}`);
    console.log(`   Message: ${data.choices[0].message.content}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    process.exit(1);
  }
}

testGroqAPI();
