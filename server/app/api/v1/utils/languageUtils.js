function detectLanguage(text) {
    const hiligaynonWords = ['gid', 'subong', 'palihog', 'may ara', 'wala', 'ano', 'sin-o', 'diin', 'kamusta', 'husto', 'bal-an', 'paano', 'ubra', 'pamangkot', 'pilia', 'kumpirmaha', 'magparehistro', 'mag-login'];
    const tagalogWords = ['po', 'opo', 'kumusta', 'salamat', 'magkano', 'saan', 'sino', 'paano', 'bakit', 'kasi', 'muna', 'na lang', 'gumawa', 'magparehistro', 'mag-login', 'pumili', 'kumpirmahin'];
    
    const lowerText = text.toLowerCase();
    
    let hiligaynonCount = hiligaynonWords.filter(word => lowerText.includes(word)).length;
    let tagalogCount = tagalogWords.filter(word => lowerText.includes(word)).length;
    
    if (lowerText.includes('halo') || lowerText.includes('musta') || lowerText.includes('maayong') || lowerText.includes('ubra') || lowerText.includes('pilia')) return 'hiligaynon';
    if (lowerText.includes('kumusta') && !lowerText.includes('gid')) return 'tagalog';
    if (lowerText.includes('gumawa') || lowerText.includes('sino')) return 'tagalog';
    if (lowerText.includes('pumili') || lowerText.includes('kumpirmahin')) return 'tagalog';
    if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('how are you') || lowerText.includes('who') || lowerText.includes('book')) return 'english';
    
    if (hiligaynonCount > tagalogCount) return 'hiligaynon';
    if (tagalogCount > hiligaynonCount) return 'tagalog';
    
    return 'english';
}

function getLocalizedResponse(language, type, data = {}) {
    const responses = {
        hiligaynon: {
            booking: (steps) => `Para makabook, palihog:\n${steps}\n\nAvailable sa amon website ukon app.`,
            noSpaces: "Wala pa kami spaces subong, pero check again later gid! 🙏",
            welcome: "Halo! Ako si Flex_Support. 👋 Ma bulig ako sa imo sa pagpangita sang coworking spaces sa Iloilo City."
        },
        tagalog: {
            booking: (steps) => `Para mag-book, pakiusap:\n${steps}\n\nAvailable sa aming website o app.`,
            noSpaces: "Wala pa kaming spaces ngayon, pero check mo ulit later, po! 🙏",
            welcome: "Halo! Ako si Flex_Support. 👋 Tutulungan kita sa paghahanap ng coworking spaces sa Iloilo City."
        },
        english: {
            booking: (steps) => `To book, please follow:\n${steps}\n\nAvailable on our website or app.`,
            noSpaces: "No spaces available at the moment, but please check again later, gid! 🙏",
            welcome: "Halo! I'm Flex_Support. 👋 I can help you find coworking spaces in Iloilo City."
        }
    };
    
    return responses[language]?.[type] || responses.english[type];
}

module.exports = {
    detectLanguage,
    getLocalizedResponse
};