const chatService = require('@/api/v1/services/chatService');

const chatSupport = async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ 
            status: 'error', 
            reply: "Please provide a message, gid!" 
        });
    }

    try {
        console.log('[Chat] Processing message...');
        const reply = await chatService.processMessage(message);
        
        res.json({ 
            status: 'success', 
            reply: reply 
        });
        
    } catch (error) {
        console.error("[Chat] Error:", error);
        res.status(500).json({ 
            status: 'error', 
            reply: "Sorry gid, something went wrong. Please try again! 🙏" 
        });
    }
};

module.exports = { chatSupport };