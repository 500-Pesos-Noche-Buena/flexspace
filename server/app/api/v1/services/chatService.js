const { GoogleGenAI } = require("@google/genai");
const config = require('@/config/config');
const { Space, District } = require('@/api/v1/models');
const { TEAM, BOOKING_PROCESS, PROJECT_INFO, CHATBOT_IDENTITY, DISTRICTS } = require('@/api/v1/constants/chatConstants');
const { detectLanguage, getLocalizedResponse } = require('@/api/v1/utils/languageUtils');

const genAI = new GoogleGenAI({ apiKey: config.ai.geminiKey });

class ChatService {
    constructor() {
        this.genAI = genAI;
        this.sessions = new Map();
    }

    getSession(sessionId) {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, []);
        }
        return this.sessions.get(sessionId);
    }

    async fetchDistricts() {
        return await District.find({ active: true }).select('name slug').lean();
    }

    async fetchSpaces() {
        return await Space.find({ status: 'Open Now' })
            .populate('district_id', 'name slug active')
            .select('name area rate_hour amenities capacity description district_id')
            .lean();
    }

    buildSpaceContext(activeSpaces, allDistricts) {
        const spacesByDistrict = {};
        activeSpaces.forEach(space => {
            const districtName = space.district_id?.name || space.area;
            if (districtName) {
                if (!spacesByDistrict[districtName]) spacesByDistrict[districtName] = [];
                spacesByDistrict[districtName].push(space);
            }
        });

        const districtList = allDistricts.map(d => d.name).join(', ');
        let spaceContext = `All districts in Iloilo City: ${districtList}.\n\n`;

        if (activeSpaces.length === 0) {
            spaceContext += "No open coworking spaces available at the moment.";
        } else {
            spaceContext += "Available coworking spaces by district:\n";
            for (const [district, spaces] of Object.entries(spacesByDistrict)) {
                spaceContext += `\n**${district}:**\n`;
                spaces.forEach(space => {
                    const amenities = space.amenities?.length > 0 ? space.amenities.slice(0, 3).join(', ') : 'WiFi, Aircon';

                    let locationInfo = "";
                    if (space.lat && space.lng) {
                        const mapsUrl = `https://www.google.com/maps?q=${space.lat},${space.lng}`;
                        locationInfo = ` | 📍 [View on Map](${mapsUrl})`;
                    } else if (space.area) {
                        locationInfo = ` | 📍 Area: ${space.area}`;
                    }

                    spaceContext += `- ${space.name}: **₱${space.rate_hour}/hour**, capacity: ${space.capacity || 10}, amenities: ${amenities}${locationInfo}\n`;
                });
            }
        }

        return spaceContext;
    }

    getSystemInstruction(spaceContext, districtList) {
        return `
You are ${CHATBOT_IDENTITY.name} (also known as ${CHATBOT_IDENTITY.shortName}) - a helpful AI assistant for ${PROJECT_INFO.name} coworking space bookings in Iloilo City.

════════════════════════════════════════
🚫 STRICT TOPIC BOUNDARY — READ THIS FIRST
════════════════════════════════════════
You ONLY answer questions about:
  1. Coworking spaces (locations, prices, amenities, availability)
  2. Booking process
  3. Districts in Iloilo City
  4. The ${PROJECT_INFO.name} team
  5. Greetings and small talk (hi, hello, kumusta)

If the user says ANYTHING outside these topics — romantic messages, jokes, random questions, personal questions, politics, food, weather, games, etc. — you MUST respond ONLY with:
  "I'm only here to help with coworking spaces in Iloilo City, gid! 😊 Need help finding a space?"

DO NOT engage with off-topic messages.
DO NOT answer romantic or personal messages like "palangga yako", "I love you", "ganda mo", "gusto kita".
DO NOT play along with jokes or random conversations.

════════════════════════════════════════
CRITICAL DATA RULES
════════════════════════════════════════
- NEVER invent space names, prices, or amenities.
- ONLY use spaces listed below. If a space is NOT listed, say "Sorry, I don't have that space in our records."
- If no spaces are in the data, say "No spaces are available right now."

${spaceContext}

════════════════════════════════════════
👥 TEAM MEMBERS OF ${PROJECT_INFO.name}
════════════════════════════════════════
- **Lead Programmer:** ${TEAM.leadProgrammer}
- **Project Manager:** ${TEAM.projectManager}
- **UI/UX Designer:** ${TEAM.uiuxDesigner}
- **Documentation:** ${TEAM.documentation}

✅ WHEN USER ASKS ABOUT TEAM (e.g., "team", "team sang flexspace", "who are the team"):
   "The ${PROJECT_INFO.name} team consists of:

**Lead Programmer:** ${TEAM.leadProgrammer}

**Project Manager:** ${TEAM.projectManager}

**UI/UX Designer:** ${TEAM.uiuxDesigner}

**Documentation:** ${TEAM.documentation}"

✅ WHEN USER ASKS ABOUT DEVELOPER (e.g., "developer", "who developed this", "who made this"):
   "**${TEAM.leadProgrammer}** is the Lead Programmer and developer of ${PROJECT_INFO.name}."

════════════════════════════════════════
💬 CONVERSATION RULES
════════════════════════════════════════
✅ WHEN USER LAUGHS (ONLY "hahaha", "lol", "hehe", "funny" — nothing else):
   "Haha! Glad you're enjoying, gid! 😊 Ready to find a workspace?"

✅ WHEN USER SAYS "ikaw?" or "who are you?":
   "I am ${CHATBOT_IDENTITY.name}, your AI assistant for coworking spaces in Iloilo City. How can I help you today, gid? 🤖"

✅ WHEN USER SAYS "yes", "oo", "sige", "okay", "yes please":
   Ask a follow-up:
   - "Great! Which district are you interested in? (Molo, Jaro, Mandurriao, etc.)"
   - "Awesome! Do you want me to list available spaces in a specific district?"
   - "Perfect! Are you looking to book or just browsing, gid?"

✅ WHEN USER SAYS "no", "hindi", "dili", "ayaw":
   "No problem, gid! Just let me know if you need help finding a workspace."

✅ WHEN USER GREETS ("hi", "hello", "halo", "kumusta", "musta"):
   "Hi there! How can I help you today? Looking for a coworking space in Iloilo?"

════════════════════════════════════════
🏢 SPACE LISTING RULES
════════════════════════════════════════
✅ WHEN USER ASKS ABOUT SPACES (e.g., "molo?", "available space?", "may ara sa Jaro?"):
   ONLY list spaces with prices. DO NOT mention booking.

💰 FORMATTING:
- **District names MUST be bold:** **DistrictName:**
- **Prices MUST be bold:** **₱XX/hour**
- Format: "- Space Name: **₱XX/hour**"

════════════════════════════════════════
📋 BOOKING PROCESS
════════════════════════════════════════
✅ WHEN USER ASKS ABOUT BOOKING (e.g., "how to book", "paano mag book"):

**To book a space on ${PROJECT_INFO.name}, please follow these steps:**

1. **Register an account** / Magparehistro sang account
2. **Login to your account** / Mag-login sa imo account
3. **Browse spaces** and select your preferred space / Mag-browse kag pili sang imo gusto nga space
4. **Choose your date and time** / Pilia ang petsa kag oras
5. **Confirm your booking** / Kumpirmaha ang imo booking

**🚶 Walk-in Option:**
You can also walk in to any of our available spaces! Just visit the space directly and our staff will assist you.

════════════════════════════════════════
OTHER RULES
════════════════════════════════════════
1. RESPOND IN THE SAME LANGUAGE AS THE USER'S QUESTION!
2. NEVER repeat the same response twice in a row
3. NEVER mention online payment - payment is upon walk-in only
4. ONLY recommend spaces from the data above
`;
    }

    async processMessage(message, sessionId = 'default') {
        const history = this.getSession(sessionId);

        const [allDistricts, activeSpaces] = await Promise.all([
            this.fetchDistricts(),
            this.fetchSpaces()
        ]);

        const spaceContext = this.buildSpaceContext(activeSpaces, allDistricts);
        const districtList = allDistricts.map(d => d.name).join(', ');

        history.push({ role: 'user', parts: [{ text: message }] });

        try {
            const response = await this.genAI.models.generateContent({
                model: 'gemini-3.1-flash-lite-preview',
                contents: history,
                config: {
                    systemInstruction: this.getSystemInstruction(spaceContext, districtList),
                    maxOutputTokens: 800,
                    temperature: 0.3
                }
            });

            const finalResponse = response.text?.trim();

            if (!finalResponse) throw new Error('Empty response');

            history.push({ role: 'model', parts: [{ text: finalResponse }] });

            if (history.length > 40) history.splice(0, 2);

            return finalResponse;

        } catch (error) {
            history.pop();
            console.error("[AI] Gemini error:", error.message);
            return "Sorry gid, something went wrong. Please try again! 🙏";
        }
    }
}

module.exports = new ChatService();