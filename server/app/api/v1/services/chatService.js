const { GoogleGenAI } = require("@google/genai");
const config = require('@/config/config');
const { Space, District, Product } = require('@/api/v1/models');
const { 
    TEAM, 
    BOOKING_PROCESS, 
    PROJECT_INFO, 
    CHATBOT_IDENTITY, 
    DISTRICTS,
    ORDER_HELP,
    MENU_HELP,
    ORDER_SPECIALS
} = require('@/api/v1/constants/chatConstants');
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
        try {
            return await District.find({ active: true }).select('name slug').lean();
        } catch (error) {
            console.error('[Chat] Error fetching districts:', error);
            return [];
        }
    }

    async fetchSpaces() {
        try {
            return await Space.find({ status: 'Open Now' })
                .populate('district_id', 'name slug active')
                .select('name area lat lng rate_hour amenities capacity description district_id occupied_seats available_rooms hours_json _id')
                .lean();
        } catch (error) {
            console.error('[Chat] Error fetching spaces:', error);
            return [];
        }
    }

    async fetchProductsForSpace(spaceId) {
        if (!spaceId) {
            console.log('[Chat] No spaceId provided');
            return [];
        }
        
        try {
            console.log(`[Chat] Fetching products for spaceId: ${spaceId}`);
            const products = await Product.find({ 
                space_id: spaceId, 
                is_available: true
            })
            .select('name price category description stock image')
            .lean()
            .limit(50);
            
            console.log(`[Chat] Found ${products.length} products for spaceId: ${spaceId}`);
            return products;
        } catch (error) {
            console.error('[Chat] Error fetching products:', error);
            return [];
        }
    }

    // ✅ BUILD SPACE CONTEXT
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

                let locationInfo = "";
                if (space.lat && space.lng) {
                    const mapsUrl = `https://www.google.com/maps?q=${space.lat},${space.lng}`;
                    locationInfo = ` | 📍 [View on Map](${mapsUrl})`;
                } else if (space.area) {
                    locationInfo = ` | 📍 ${space.area}`;
                } else {
                    locationInfo = ` | 📍 ${district} district, Iloilo City`;
                }

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

                let roomsInfo = space.available_rooms
                    ? ` | 🚪 Rooms: ${space.available_rooms}`
                    : "";

                spaceContext += `- ${space.name} (ID: ${space._id}): **₱${space.rate_hour}/hour**, seats available: ${availableSeats}/${space.capacity || 10}, amenities: ${amenities}${locationInfo}${hoursInfo}${roomsInfo}\n`;
            });
        }

        return spaceContext;
    }

    // ✅ BUILD PRODUCT CONTEXT
    buildProductContext(products, spaceName) {
        if (!products || products.length === 0) {
            return `No products available for ${spaceName || 'this space'} at the moment.`;
        }

        // Group products by category
        const categories = {
            food: [],
            beverage: [],
            snacks: [],
            merch: []
        };

        products.forEach(product => {
            if (categories[product.category]) {
                categories[product.category].push(product);
            }
        });

        let productContext = `\n📋 **Available Products at ${spaceName || 'this space'}:**\n\n`;

        // Food
        if (categories.food.length > 0) {
            productContext += `**🍔 Food:**\n`;
            categories.food.forEach(p => {
                productContext += `- ${p.name}: ₱${p.price}${p.description ? ` (${p.description})` : ''}${p.stock > 0 ? ` | Stock: ${p.stock}` : ' | Out of stock'}\n`;
            });
            productContext += '\n';
        }

        // Beverages
        if (categories.beverage.length > 0) {
            productContext += `**☕ Beverages/Drinks:**\n`;
            categories.beverage.forEach(p => {
                productContext += `- ${p.name}: ₱${p.price}${p.description ? ` (${p.description})` : ''}${p.stock > 0 ? ` | Stock: ${p.stock}` : ' | Out of stock'}\n`;
            });
            productContext += '\n';
        }

        // Snacks
        if (categories.snacks.length > 0) {
            productContext += `**🍿 Snacks:**\n`;
            categories.snacks.forEach(p => {
                productContext += `- ${p.name}: ₱${p.price}${p.description ? ` (${p.description})` : ''}${p.stock > 0 ? ` | Stock: ${p.stock}` : ' | Out of stock'}\n`;
            });
            productContext += '\n';
        }

        // Merch
        if (categories.merch.length > 0) {
            productContext += `**🎁 Merchandise:**\n`;
            categories.merch.forEach(p => {
                productContext += `- ${p.name}: ₱${p.price}${p.description ? ` (${p.description})` : ''}${p.stock > 0 ? ` | Stock: ${p.stock}` : ' | Out of stock'}\n`;
            });
            productContext += '\n';
        }

        return productContext;
    }

    // ✅ GET SYSTEM INSTRUCTION
    getSystemInstruction(spaceContext, districtList, productContext = '') {
        return `
You are ${CHATBOT_IDENTITY.name} (also known as ${CHATBOT_IDENTITY.shortName}) - a helpful AI assistant for ${PROJECT_INFO.name} coworking space bookings in Iloilo City.

${spaceContext}

${productContext}

════════════════════════════════════════
🍔 ORDER HELP
════════════════════════════════════════
When users ask "how to order" or "how do I order":
${ORDER_HELP}

When users ask "what's special" or "recommendations":
${ORDER_SPECIALS}

When users ask about ordering specific items:
Always respond with: "Great choice! Click the 🛒 Shopping Cart button in the chat header to see the full menu and place your order. You can find [item name] there! 🍔☕"

When users ask about payment for orders:
"💳 We accept two payment methods for food orders:
1. 💵 Cash on Pickup - Pay when you pick up your order
2. 📱 Online Payment - Pay via GCash or PayMaya

*All food orders must be picked up at the counter.*"

════════════════════════════════════════
OTHER RULES
════════════════════════════════════════
1. NEVER invent product prices - use ONLY the prices from the product list above.
2. If a product is NOT in the list, say: "Sorry, that item is not available at this space, gid."
3. If the list is empty, say: "No products are available right now, gid."
4. Respond in the same language as the user (Filipino, Hiligaynon, or English)
5. NEVER repeat the same response twice in a row
`;
    }

    // ✅ MAIN PROCESS MESSAGE METHOD
    async processMessage(message, sessionId = 'default') {
        const history = this.getSession(sessionId);

        // Fetch all spaces first
        const allSpaces = await this.fetchSpaces();
        console.log(`[Chat] Found ${allSpaces.length} active spaces`);

        // Try to detect if user is asking about menu/order
        const isMenuQuery = /menu|food|drink|snack|order|eat|hungry|coffee|tea|meal|sandwich|burger|pizza|pasta|fries|cookie|cake|juice|soda|water|merch|item|available|what.*have|show.*menu|list.*food|products|items/i.test(message);
        
        let spaceId = null;
        let productContext = '';
        let targetSpaceName = '';

        if (isMenuQuery) {
            console.log('[Chat] Menu query detected');
            
            // Try to find which space they're asking about
            let targetSpace = null;
            
            // Extract space name from the message
            const spaceNameMatch = message.match(/(?:at|in|for)\s+([A-Za-z\s]+?)(?:\s+space|\s+hub|\s+location|$|\?)/i) || 
                                  message.match(/(?:from|sa)\s+([A-Za-z\s]+?)(?:\s+space|\s+hub|\s+location|$|\?)/i) ||
                                  message.match(/menu\s+(?:of|for|at|in)\s+([A-Za-z\s]+?)(?:\s+space|\s+hub|\s+location|$|\?)/i);
            
            if (spaceNameMatch && spaceNameMatch[1]) {
                const spaceName = spaceNameMatch[1].trim().toLowerCase();
                console.log(`[Chat] Looking for space: "${spaceName}"`);
                
                // Try to find exact match
                targetSpace = allSpaces.find(s => 
                    s.name.toLowerCase() === spaceName ||
                    s.name.toLowerCase().includes(spaceName) ||
                    spaceName.includes(s.name.toLowerCase())
                );
                
                // If not found, try fuzzy match with district
                if (!targetSpace) {
                    targetSpace = allSpaces.find(s => 
                        s.district_id?.name?.toLowerCase().includes(spaceName) ||
                        s.area?.toLowerCase().includes(spaceName)
                    );
                }
            }
            
            // If no space specified, try to use the first active space
            if (!targetSpace && allSpaces.length > 0) {
                targetSpace = allSpaces[0];
                console.log(`[Chat] No specific space mentioned, using first: ${targetSpace.name}`);
            }

            if (targetSpace) {
                spaceId = targetSpace._id;
                targetSpaceName = targetSpace.name;
                console.log(`[Chat] Using space: "${targetSpaceName}" (ID: ${spaceId})`);
                
                const products = await this.fetchProductsForSpace(spaceId);
                productContext = this.buildProductContext(products, targetSpaceName);
                console.log(`[Chat] Product context built: ${productContext.length} chars`);
            } else {
                console.log('[Chat] No space found for menu query');
                productContext = "No active spaces found. Please check back later.";
            }
        }

        const [allDistricts] = await Promise.all([
            this.fetchDistricts()
        ]);

        const spaceContext = this.buildSpaceContext(allSpaces, allDistricts);
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
                console.log(`[Chat] 🔄 Trying model: ${modelName}`);

                const response = await this.genAI.models.generateContent({
                    model: modelName,
                    contents: history,
                    config: {
                        systemInstruction: this.getSystemInstruction(spaceContext, districtList, productContext),
                        maxOutputTokens: 800,
                        temperature: 0.3
                    }
                });

                const finalResponse = response.text?.trim();
                if (finalResponse) {
                    console.log(`[Chat] ✅ Success! Using model: ${modelName}`);
                    history.push({ role: 'model', parts: [{ text: finalResponse }] });

                    if (history.length > 40) history.splice(0, 2);
                    return finalResponse;
                }
            } catch (error) {
                lastError = error;
                console.log(`[Chat] ❌ Failed: ${modelName} - ${error.message}`);
                continue;
            }
        }

        // If all models fail, return a helpful fallback
        history.pop();
        console.error("[Chat] All models failed:", lastError?.message);

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