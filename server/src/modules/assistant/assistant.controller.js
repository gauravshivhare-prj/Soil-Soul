import { generateAssistantResponse } from './assistant.service.js';

export async function handleAssistantChat(req, res, next) {
  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message is required and must be a non-empty string.',
        },
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message cannot exceed 500 characters.',
        },
      });
    }

    let sanitizedHistory = [];
    if (Array.isArray(history)) {
      sanitizedHistory = history.slice(-10).map((item) => ({
        role: item?.role === 'user' ? 'user' : 'assistant',
        content: typeof item?.content === 'string' ? item.content.slice(0, 500) : '',
      }));
    }

    const response = await generateAssistantResponse({
      message: message.trim(),
      history: sanitizedHistory,
    });

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (err) {
    next(err);
  }
}
