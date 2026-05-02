const { GoogleGenAI } = require("@google/genai");
const config = require('@/config/config');
const { Space, District } = require('@/api/v1/models');
const { TEAM, BOOKING_PROCESS, PROJECT_INFO, CHATBOT_IDENTITY, DISTRICTS } = require('@/api/v1/constants/chatConstants');
const { detectLanguage, getLocalizedResponse } = require('@/api/v1/utils/languageUtils');

const genAI = new GoogleGenAI({ apiKey: config.ai.geminiKey });

class ChatService {
    constructor() {
        this.genAI = genAI;
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
                spaceContext += `\n${district}:\n`;
                spaces.forEach(space => {
                    const amenities = space.amenities?.length > 0 ? space.amenities.slice(0, 3).join(', ') : 'WiFi, Aircon';
                    spaceContext += `  - ${space.name}: ₱${space.rate_hour}/hour, capacity: ${space.capacity || 10}, amenities: ${amenities}\n`;
                });
            }
        }

        return spaceContext;
    }

    getSystemInstruction(spaceContext, districtList) {
        return `
You are ${CHATBOT_IDENTITY.name} (also known as ${CHATBOT_IDENTITY.shortName}) - a helpful AI assistant for ${PROJECT_INFO.name} coworking space bookings in Iloilo City.

CRITICAL RULES:
- Your name is "${CHATBOT_IDENTITY.name}" or "${CHATBOT_IDENTITY.shortName}"
- The company/project name is "${PROJECT_INFO.name}" ONLY (no "AI" after company name)
- When asked about the team, say "${PROJECT_INFO.name} team" not "${PROJECT_INFO.name} AI team"

${spaceContext}

TEAM MEMBERS OF ${PROJECT_INFO.name}:
- Lead Programmer: ${TEAM.leadProgrammer}
- Project Manager: ${TEAM.projectManager}
- UI/UX Designer: ${TEAM.uiuxDesigner}
- Documentation: ${TEAM.documentation}

BOOKING PROCESS (ALWAYS explain these steps when user asks about booking):
Step 1: Register an account / Magparehistro sang account
Step 2: Login to your account / Mag-login sa imo account  
Step 3: Browse spaces and select your preferred space / Mag-browse kag pili sang imo gusto nga space
Step 4: Choose your date and time / Pilia ang petsa kag oras
Step 5: Confirm your booking / Kumpirmaha ang imo booking

IMPORTANT RULES:
1. RESPOND IN THE SAME LANGUAGE AS THE USER'S QUESTION!
2. WHEN ASKED ABOUT TEAM/DEVELOPER, ALWAYS mention ALL team members
3. When introducing yourself, say "I am ${CHATBOT_IDENTITY.name}"
4. When talking about the company/project, say "${PROJECT_INFO.name}" (without AI)
5. ONLY recommend real spaces from the list above
6. Keep responses helpful but concise

⚡ RESPONSE PATTERNS:

Greeting ("hi", "hello", "musta"):
→ "Hey! Ready to find a workspace?" / "Hi there! Looking for a space?"

Asking about spaces:
→ List real spaces from the data above with rates

Asking about districts (Molo, Jaro, etc.):
→ "Sa [district], may ara kami: [space names] at ₱[rate]/hour"

Asking about booking:
→ Explain the 5-step process above

Asking about the team:
→ List all team members with their roles

Asking "who developed this":
→ "${TEAM.leadProgrammer} built ${PROJECT_INFO.name} as Lead Programmer"

Unknown questions:
→ "I can help with coworking spaces in Iloilo. Want to see available spaces in Molo, Jaro, or Mandurriao?"

Remember: You're helpful, fast, and natural. No robotic responses!`;

    }

    async generateAIResponse(message, spaceContext, districtList) {
        try {
            const response = await this.genAI.models.generateContent({
                model: 'gemini-3.1-flash-lite-preview',
                contents: message,
                config: {
                    systemInstruction: this.getSystemInstruction(spaceContext, districtList),
                    maxOutputTokens: 800, 
                    temperature: 0.3
                }
            });
            
            return response.text?.trim() || null;
        } catch (error) {
            console.error("[AI] Gemini error:", error.message);
            return null;
        }
    }

    handleBookingQuery(userLanguage) {
        const steps = BOOKING_PROCESS.steps.join('\n');
        
        if (userLanguage === 'hiligaynon') {
            return `Para makabook sa ${PROJECT_INFO.name}, palihog sunda ini nga mga steps, gid:\n\n${steps}\n\nPwede ka mag-book sa amon website ukon mobile app. Gusto mo makita ang available spaces, gid? 📍`;
        }
        if (userLanguage === 'tagalog') {
            return `Para mag-book sa ${PROJECT_INFO.name}, sundin ang mga steps na ito, po:\n\n${steps}\n\nPwede kang mag-book sa aming website o mobile app. Gusto mo bang makita ang available spaces, po? 📍`;
        }
        return `To book a space on ${PROJECT_INFO.name}, please follow these steps:\n\n${steps}\n\nYou can book through our website or mobile app. Would you like to see available spaces, gid? 📍`;
    }

    handleTeamQuery(userLanguage) {
        if (userLanguage === 'hiligaynon') {
            return `Ang team sang ${PROJECT_INFO.name} amo sila gid: Lead Programmer si ${TEAM.leadProgrammer}, Project Manager si ${TEAM.projectManager}, UI/UX Designer si ${TEAM.uiuxDesigner}, kag Documentation nanday ${TEAM.documentation}. Salamat gid sa ila! 💻`;
        }
        if (userLanguage === 'tagalog') {
            return `Ang team ng ${PROJECT_INFO.name} ay sina: Lead Programmer si ${TEAM.leadProgrammer}, Project Manager si ${TEAM.projectManager}, UI/UX Designer si ${TEAM.uiuxDesigner}, at Documentation sina ${TEAM.documentation}. Maraming salamat sa kanila! 💻`;
        }
        return `The ${PROJECT_INFO.name} team consists of: Lead Programmer ${TEAM.leadProgrammer}, Project Manager ${TEAM.projectManager}, UI/UX Designer ${TEAM.uiuxDesigner}, and Documentation by ${TEAM.documentation}. Thank you to the entire team! 💻`;
    }

    handleDistrictQuery(message, spaces, district, userLanguage) {
        const spacesInDistrict = spaces.filter(s => 
            s.district_id?.name?.toLowerCase() === district ||
            s.area?.toLowerCase() === district
        );
        
        if (spacesInDistrict.length > 0) {
            const list = spacesInDistrict.map(s => `${s.name} (₱${s.rate_hour}/hr)`).join(', ');
            if (userLanguage === 'hiligaynon') return `Sa ${district}, may ara kami: ${list} gid! Want to book? 📍`;
            if (userLanguage === 'tagalog') return `Sa ${district}, mayroon kami: ${list} po! Want to book? 📍`;
            return `In ${district}, we have: ${list} gid! Want to book? 📍`;
        }
        
        const districtsWithSpaces = [...new Set(spaces.map(s => s.district_id?.name || s.area).filter(Boolean))];
        if (districtsWithSpaces.length > 0) {
            if (userLanguage === 'hiligaynon') return `Wala pa spaces sa ${district} subong, gid. Pero may ara sa ${districtsWithSpaces.slice(0, 3).join(', ')}.`;
            if (userLanguage === 'tagalog') return `Wala pang spaces sa ${district} ngayon, po. Pero mayroon sa ${districtsWithSpaces.slice(0, 3).join(', ')}.`;
            return `No spaces in ${district} yet, gid. But we have spaces in ${districtsWithSpaces.slice(0, 3).join(', ')}.`;
        }
        
        if (userLanguage === 'hiligaynon') return `Wala pa spaces sa ${district} subong. Check again later, gid! 🙏`;
        if (userLanguage === 'tagalog') return `Wala pang spaces sa ${district} ngayon. Check again later, po! 🙏`;
        return `No spaces in ${district} yet. Check again later, gid! 🙏`;
    }

    handleGeneralQuery(message, spaces, userLanguage) {
        const msg = message.toLowerCase();
        
        if (msg.includes('space') || msg.includes('available')) {
            if (spaces.length === 0) {
                return getLocalizedResponse(userLanguage, 'noSpaces');
            }
            
            const districtsWithSpaces = [...new Set(spaces.map(s => s.district_id?.name || s.area).filter(Boolean))];
            const cheapest = Math.min(...spaces.map(s => s.rate_hour));
            
            if (userLanguage === 'hiligaynon') {
                return `May ara kami ${spaces.length} spaces available gid! 📍 Locations: ${districtsWithSpaces.join(', ')}. Rates start at ₱${cheapest}/hour. Ano nga district ang imo gusto?`;
            }
            if (userLanguage === 'tagalog') {
                return `Mayroon kaming ${spaces.length} spaces available po! 📍 Locations: ${districtsWithSpaces.join(', ')}. Rates start at ₱${cheapest}/hour. Aling district ang gusto mo?`;
            }
            return `We have ${spaces.length} spaces available gid! 📍 Locations: ${districtsWithSpaces.join(', ')}. Rates start at ₱${cheapest}/hour. Which district interests you?`;
        }
        
        return getLocalizedResponse(userLanguage, 'welcome');
    }

    async processMessage(message) {
        const userLanguage = detectLanguage(message);
        
        const [allDistricts, activeSpaces] = await Promise.all([
            this.fetchDistricts(),
            this.fetchSpaces()
        ]);
        
        const spaceContext = this.buildSpaceContext(activeSpaces, allDistricts);
        const districtList = allDistricts.map(d => d.name).join(', ');
        
        let response = await this.generateAIResponse(message, spaceContext, districtList);
        
        if (!response) {
            const msg = message.toLowerCase();
            
            if (msg.includes('book') || msg.includes('booking') || msg.includes('paano mag book') || msg.includes('how to book')) {
                response = this.handleBookingQuery(userLanguage);
            } 
            else if (msg.includes('team') || msg.includes('developer') || msg.includes('who made') || msg.includes('who developed') || msg.includes('created by')) {
                response = this.handleTeamQuery(userLanguage);
            }
            else {
                const matchedDistrict = DISTRICTS.find(d => msg.includes(d));
                if (matchedDistrict) {
                    response = this.handleDistrictQuery(message, activeSpaces, matchedDistrict, userLanguage);
                } else {
                    response = this.handleGeneralQuery(message, activeSpaces, userLanguage);
                }
            }
        }
        
        return response;
    }
}

module.exports = new ChatService();