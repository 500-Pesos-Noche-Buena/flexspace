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
            .select('name area lat lng rate_hour amenities capacity description district_id occupied_seats available_rooms hours_json')
            .lean();
    }

    buildSpaceContext(activeSpaces, allDistricts) {
        const spacesByDistrict = {};
        activeSpaces.forEach(space => {
            const districtName = space.district_id?.name || space.area || 'Unknown';
            if (!spacesByDistrict[districtName]) spacesByDistrict[districtName] = [];
            spacesByDistrict[districtName].push(space);
        });

        const districtList = allDistricts.map(d => d.name).join(', ');
        let spaceContext = `All districts in Iloilo City: ${districtList}.\n\n`;

        if (activeSpaces.length === 0) {
            spaceContext += "No open coworking spaces available at the moment.";
            return spaceContext;
        }

        spaceContext += "Available coworking spaces by district:\n";

        for (const [district, spaces] of Object.entries(spacesByDistrict)) {
            spaceContext += `\n**${district}:**\n`;
            spaces.forEach(space => {
                const amenities = space.amenities?.length > 0
                    ? space.amenities.slice(0, 3).join(', ')
                    : 'WiFi, Aircon';

                const availableSeats = (space.capacity || 10) - (space.occupied_seats || 0);

                // Location: prefer lat/lng map link, fallback to area text, fallback to district
                let locationInfo = "";
                if (space.lat && space.lng) {
                    const mapsUrl = `https://www.google.com/maps?q=${space.lat},${space.lng}`;
                    locationInfo = ` | 📍 [View on Map](${mapsUrl})`;
                } else if (space.area) {
                    locationInfo = ` | 📍 ${space.area}`;
                } else {
                    locationInfo = ` | 📍 ${district} district, Iloilo City`;
                }

                // Opening hours if available
                let hoursInfo = "";
                if (space.hours_json) {
                    try {
                        const hours = typeof space.hours_json === 'string'
                            ? JSON.parse(space.hours_json)
                            : space.hours_json;
                        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                        if (hours[today]) {
                            hoursInfo = ` | 🕐 Today: ${hours[today]}`;
                        }
                    } catch (e) { /* skip if malformed */ }
                }

                // Available rooms
                let roomsInfo = space.available_rooms
                    ? ` | 🚪 Rooms: ${space.available_rooms}`
                    : "";

                spaceContext += `- ${space.name}: **₱${space.rate_hour}/hour**, seats available: ${availableSeats}/${space.capacity || 10}, amenities: ${amenities}${locationInfo}${hoursInfo}${roomsInfo}\n`;
            });
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
  1. Coworking spaces (locations, prices, amenities, availability, seats, hours)
  2. Booking process
  3. Districts in Iloilo City
  4. The ${PROJECT_INFO.name} team
  5. Greetings and small talk (hi, hello, kumusta)

If the user says ANYTHING outside these topics — romantic messages, jokes, random questions, personal questions, politics, food, weather, games, etc. — respond ONLY with:
  "I'm only here to help with coworking spaces in Iloilo City, gid! 😊 Need help finding a space?"

DO NOT engage with off-topic messages.
DO NOT answer romantic or personal messages like "palangga yako", "I love you", "ganda mo", "gusto kita".
DO NOT play along with jokes or random conversations.

════════════════════════════════════════
CRITICAL DATA RULES
════════════════════════════════════════
- NEVER invent space names, prices, amenities, or addresses.
- ONLY use the exact spaces listed below.
- If a space is NOT in the list, say: "Sorry, I don't have that space in our records, gid."
- If the list is empty, say: "No spaces are available right now, gid."

${spaceContext}

════════════════════════════════════════
📍 LOCATION QUESTIONS
════════════════════════════════════════
✅ WHEN USER ASKS WHERE A SPACE IS (e.g., "diin", "where", "location", "address", "paano makabot", "how to get there", "map"):
   - If the space data above has a [View on Map] link → share it directly.
   - If the space data has an area/address text → share that text.
   - If neither exists → say: "The exact address of [space name] is not yet in our system, gid. You may contact us or visit ${PROJECT_INFO.name} for directions. 😊"
   NEVER say this is off-topic. Location is always a valid question.

════════════════════════════════════════
👥 TEAM MEMBERS OF ${PROJECT_INFO.name}
════════════════════════════════════════
- **Lead Programmer:** ${TEAM.leadProgrammer}
- **Project Manager:** ${TEAM.projectManager}
- **UI/UX Designer:** ${TEAM.uiuxDesigner}
- **Documentation:** ${TEAM.documentation}

✅ WHEN USER ASKS ABOUT TEAM:
   "The ${PROJECT_INFO.name} team consists of:
   **Lead Programmer:** ${TEAM.leadProgrammer}
   **Project Manager:** ${TEAM.projectManager}
   **UI/UX Designer:** ${TEAM.uiuxDesigner}
   **Documentation:** ${TEAM.documentation}"

✅ WHEN USER ASKS ABOUT DEVELOPER ("who made this", "who developed"):
   "**${TEAM.leadProgrammer}** is the Lead Programmer and developer of ${PROJECT_INFO.name}."

════════════════════════════════════════
💬 CONVERSATION RULES
════════════════════════════════════════
✅ GREETINGS ("hi", "hello", "halo", "kumusta", "musta"):
   "Hi there! How can I help you today? Looking for a coworking space in Iloilo? 😊"

✅ USER LAUGHS (ONLY "hahaha", "lol", "hehe", "funny"):
   "Haha! Glad you're enjoying, gid! 😊 Ready to find a workspace?"

✅ "who are you?" / "ikaw?":
   "I am ${CHATBOT_IDENTITY.name}, your AI assistant for coworking spaces in Iloilo City. How can I help you today, gid? 🤖"

✅ AFFIRMATIVE ("yes", "oo", "sige", "okay"):
   Ask a follow-up:
   "Great! Which district are you interested in? (${districtList})"

✅ NEGATIVE ("no", "hindi", "dili", "ayaw"):
   "No problem, gid! Just let me know if you need help finding a workspace."

════════════════════════════════════════
🏢 SPACE LISTING RULES
════════════════════════════════════════
✅ WHEN USER ASKS ABOUT SPACES:
   List only spaces from the data above with bold prices.
   Format: "- Space Name: **₱XX/hour** | X seats available"
   DO NOT mention booking unless the user asks.

✅ WHEN USER ASKS ABOUT AVAILABILITY / SEATS:
   Use the "seats available" info from the data above.
   Example: "Molo CoWork has 5/10 seats available right now, gid."

════════════════════════════════════════
📋 BOOKING PROCESS
════════════════════════════════════════
✅ WHEN USER ASKS HOW TO BOOK:

**To book a space on ${PROJECT_INFO.name}:**

1. **Register an account** / Magparehistro sang account
2. **Login to your account** / Mag-login sa imo account
3. **Browse spaces** and select your preferred space
4. **Choose your date and time** / Pilia ang petsa kag oras
5. **Confirm your booking** / Kumpirmaha ang imo booking

**🚶 Walk-in Option:** You can also walk in directly — our staff will assist you.

════════════════════════════════════════
OTHER RULES
════════════════════════════════════════
1. RESPOND IN THE SAME LANGUAGE AS THE USER (Filipino, Hiligaynon, or English)
2. NEVER repeat the same response twice in a row
3. NEVER mention online payment — payment is upon walk-in only
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

        // Inside your chatService.js - processMessage method
        const modelsToTry = [
            // Gemini 3 Series (Newer, might have separate quota)
            'gemini-3.1-flash-lite-preview', // As you requested
            'gemini-3.1-pro-preview',
            'models/gemini-3.1-flash-lite-preview',
            
            // Gemini 2.0 Series (Your old ones, currently exhausted)
            'gemini-2.0-flash-lite',
            'gemini-2.0-flash',
            
            // Gemini 2.5 Series (A middle-ground option)
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
        ];

        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`[AI] 🔄 Trying model: ${modelName}`);

                const response = await this.genAI.models.generateContent({
                    model: modelName,
                    contents: history,
                    config: {
                        systemInstruction: this.getSystemInstruction(spaceContext, districtList),
                        maxOutputTokens: 800,
                        temperature: 0.3
                    }
                });

                const finalResponse = response.text?.trim();
                if (finalResponse) {
                    console.log(`[AI] ✅ Success! Using model: ${modelName}`);
                    history.push({ role: 'model', parts: [{ text: finalResponse }] });

                    if (history.length > 40) history.splice(0, 2);
                    return finalResponse;
                }
            } catch (error) {
                lastError = error;
                console.log(`[AI] ❌ Failed: ${modelName} - ${error.message}`);
                continue;
            }
        }

        // If all models fail, return a helpful fallback
        history.pop();
        console.error("[AI] All models failed:", lastError?.message);

        // Return a fallback response in the user's language
        const lang = detectLanguage(message);
        const fallbacks = {
            english: "I'm having trouble connecting to my AI service right now. Please try again in a few moments, or you can contact our support team directly for assistance! 🙏",
            tagalog: "May problema sa koneksyon ngayon. Pakisubukan muli mamaya, o makipag-ugnayan sa aming support team para sa tulong! 🙏",
            hiligaynon: "May problema sa koneksyon subong. Palihog subli liwat sa ulihi, o kontak sa amon support team para sa bulig! 🙏"
        };

        return fallbacks[lang] || fallbacks.english;
    }
}

module.exports = new ChatService();