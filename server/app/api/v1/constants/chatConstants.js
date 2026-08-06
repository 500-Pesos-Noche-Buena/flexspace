// Team information
const TEAM = {
    leadProgrammer: "Josiah Danielle Gallenero",
    projectManager: "Neil Mar De Asis",
    uiuxDesigner: "Jesmond Sardiniola",
    documentation: "Ferwin Khen Hautea and Jo Vincent Beldad"
};

// Booking process explanation
const BOOKING_PROCESS = {
    steps: [
        "1. Register an account / Mag-register sang account",
        "2. Login to your account / Mag-login sa imo account",
        "3. Browse and select your preferred space / Pilia ang imo gusto nga space",
        "4. Choose your date and time / Pilia ang petsa kag oras",
        "5. Confirm your booking / Kumpirmaha ang imo booking"
    ],
    platforms: "Website or mobile app / Website ukon mobile app"
};

// Project info
const PROJECT_INFO = {
    name: "FlexSpace",
    developer: "Josiah Danielle Gallenero"
};

const CHATBOT_IDENTITY = {
    name: "FlexSpace AI",
    shortName: "Flex Support"
};

// District list
const DISTRICTS = ['molo', 'jaro', 'mandurriao', 'city proper', 'la paz', 'arevalo'];

// 🍔 ORDER HELP CONSTANTS (No hardcoded products - these are just help text)
const ORDER_HELP = `
🍔 **How to Order Food on FlexSpace:**

1. **Click the 🛒 Shopping Cart icon** in the chat header
2. **Browse the menu** and select items you want
3. **Add items to your cart** using the + button
4. **Checkout** and choose your payment method:
   - 💵 Cash on Pickup
   - 📱 Online Payment (GCash/PayMaya)
5. **Wait for confirmation** - you'll be notified when your order is ready!

💡 **Pro Tip:** You can also ask me about menu items, specials, or get recommendations!
`;

const MENU_HELP = `
📋 **Menu Categories Available:**
• 🍔 Food
• ☕ Beverages/Drinks
• 🍿 Snacks
• 🎁 Merchandise

*Click the 🛒 Shopping Cart button to see the full menu with prices!*
`;

const ORDER_SPECIALS = `
✨ **Today's Specials & Recommendations:**

1. 🌟 **FlexSpace Combo Meal** - Ask our staff for today's combo specials
2. ☕ **Barista's Choice** - Ask our barista for today's special coffee
3. 🍪 **Fresh Baked Goods** - Baked fresh every morning!
4. 💪 **Productivity Pack** - Coffee + snack combo

*Ask our staff for today's full specials when you order!*
`;

module.exports = {
    TEAM,
    BOOKING_PROCESS,
    PROJECT_INFO,
    DISTRICTS,
    CHATBOT_IDENTITY,
    ORDER_HELP,
    MENU_HELP,
    ORDER_SPECIALS
};